// defined by worklet context
const SAMPLE_RATE = /** @type {number} */ (window.sampleRate);

/** @template T */
class AsyncQueue {
    bucket = /** @type {T[]} */ ([]);
    resolve = /** @type {((item: T) => void) | undefined} */ (undefined);

    /** @param {T} item  */
    push(item) {
        if (this.resolve) {
            this.resolve(item);
            this.resolve = undefined;
        } else {
            this.bucket.push(item);
        }
    }

    shift() {
        const item = this.bucket.shift();
        if (item) {
            return Promise.resolve(item);
        } else {
            const p = new Promise(r => this.resolve = r);
            return /** @type {Promise<T>} */ (p);
        }
    }
}

class WorkletDecoder extends AudioWorkletProcessor {
    chunks = /** @type {AsyncQueue<Float32Array>} */ (new AsyncQueue());    
    chunk = new Float32Array();
    chunkIndex = 0;
    samples = /** @type {Generator<number>} */ (undefined);
    prevNegative = 0;
    waveLength = 0;

    constructor() {
        super()
        this.samples = this.getSamples();
        this.start();
    }

    process(inputs) {
        const channels = inputs[0];
        const chunk = channels[0];
        if (chunk) {
            this.chunks.push(chunk);
        }

        // true = safe to clean up this node
        return !!this.chunk;
    }

    async * getSamples() {
        while (true) {
            if (!this.chunk || this.chunkIndex >= this.chunk.length) {
                this.chunk = await this.chunks.shift();
                this.chunkIndex = 0;
                continue;
            }
            yield this.chunk[this.chunkIndex];
            this.chunkIndex += 1;
        }
    }

    async start() {
        console.log('started');
        console.log(`sample rate: ${sampleRate}`);
        for await (const sample of this.samples) {
            const isNegative = sample < 0;
            this.waveLength += 1;
            this.count += 1;
            if (!this.prevNegative && isNegative) {
                // falling edge detected
                console.log(`wavelength ${this.waveLength}`);
                this.waveLength = 0;
            }
            this.prevNegative = isNegative;
        }
    }
}

registerProcessor('worklet-decoder', WorkletDecoder);
