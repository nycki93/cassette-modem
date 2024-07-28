// defined by worklet context
const SAMPLE_RATE = /** @type {number} */ (sampleRate);

const ZERO_FRAMES = SAMPLE_RATE / 1200;
const ZERO_PULSES = 4;
const ONE_FRAMES = SAMPLE_RATE / 2400;
const ONE_PULSES = 8;
const THRESHOLD = (ZERO_FRAMES + ONE_FRAMES) / 2;

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

    constructor() {
        super()
        this.startAsync();
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

    /** 
     * @param {AsyncGenerator<number>} samples  
     * @returns the time between falling edges, as number of samples
     */
    async * getWavelengths(samples) {
        let prevIsNegative = false;
        let wavelength = 0;
        for await (const sample of samples) {
            const isNegative = sample < 0;
            wavelength += 1;
            if (!prevIsNegative && isNegative) {
                // falling edge detected
                yield wavelength;
                wavelength = 0;
            }
            prevIsNegative = isNegative;
        }
    }

    /** @param {AsyncGenerator<number>} wavelengths  */
    async * getBytes(wavelengths) {
        const threshold = ZERO_FRAMES - 2;
        let waveCount = 0;
        let longCount = 0;
        let bitCount = 0;
        let byteValue = 0;
        let idle = true;
        for await (const wl of wavelengths) {
            waveCount += 1;
            longCount += (wl >= threshold);

            if (idle) {
                // wait for leading zero
                if (wl < threshold) {
                    longCount = 0;
                }
                if (longCount == ZERO_PULSES) {
                    waveCount = 0;
                    longCount = 0;
                    idle = false;
                }
                continue;
            }
            
            let bit = undefined;
            if (longCount == 4) {
                bit = 0;
            } else if (waveCount == 8) {
                bit = 1;
            }

            if (bit !== undefined) {
                byteValue = (byteValue >> 1) + (bit << 7);
                bitCount += 1;
                longCount = 0;
                waveCount = 0;
            }

            if (bitCount === 8) {
                yield byteValue;
                bitCount = 0;
                idle = true;
            }
        }
    }

    async startAsync() {
        const samples = this.getSamples();
        const wavelengths = this.getWavelengths(samples);
        const bytes = this.getBytes(wavelengths);
        for await (const byte of bytes) {
            this.port.postMessage(byte);
        }
    }
}

registerProcessor('worklet-decoder', WorkletDecoder);
