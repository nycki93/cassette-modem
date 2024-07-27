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

    /** @param {Generator<number>} wavelengths  */
    async * getBits(wavelengths) {
        let oneCount = 0;
        let zeroCount = 0;
        for await (const wl of wavelengths) {
            if (wl < THRESHOLD) {
                oneCount += 1;
                zeroCount = 0;
            } else {
                zeroCount += 1;
                oneCount = 0;
            }
            if (oneCount >= ONE_PULSES) {
                yield 1;
                oneCount = 0;
            }
            if (zeroCount >= ZERO_PULSES) {
                yield 0;
                zeroCount = 0;
            }
        }
    }

    /** @param {Generator<number>} bitstream  */
    async * getBytes(bitstream) {
        let bits = [];
        let isIdle = true;
        for await (const bit of bitstream) {
            // wait for sync bit
            if (isIdle) {
                isIdle = (bit == 1);
                continue;
            }

            bits.push(bit);

            if (bits.length == 8) {
                let byte = 0;
                for (const b of bits.reverse()) {
                    byte = byte * 2 + b;
                }
                yield byte;
                bits = [];
                isIdle = true;
            }
        }
    }

    async startAsync() {
        const samples = this.getSamples();
        const wavelengths = this.getWavelengths(samples);
        const bitstream = this.getBits(wavelengths);
        // for await (const bit of bitstream) {
        //     this.port.postMessage(bit.toString().charCodeAt(0));
        // }
        const bytes = this.getBytes(bitstream);
        for await (const byte of bytes) {
            this.port.postMessage(byte);
        }
    }
}

registerProcessor('worklet-decoder', WorkletDecoder);
