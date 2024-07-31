// defined by worklet context
const SAMPLE_RATE = /** @type {number} */ (sampleRate);

const ZERO_FRAMES = SAMPLE_RATE / 1200;
const ZERO_PULSES = 4;
const ONE_FRAMES = SAMPLE_RATE / 2400;
const ONE_PULSES = 8;
const THRESHOLD = ONE_FRAMES * 1.5;

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
        let isPositive = false;
        let wavelength = 0;
        let highTime = 0;
        let lowTime = 0;
        for await (const sample of samples) {
            wavelength += 1;
            if (sample > 0) {
                lowTime = 0;
                highTime += 1;
            } else {
                lowTime += 1;
                highTime = 0;
            }
            if (!isPositive && highTime >= 4) {
                isPositive = true;
            }
            if (isPositive && lowTime >= 4) {
                isPositive = false;
                // falling edge detected
                yield wavelength;
                if (wavelength < 12) {
                    // but its really short?
                    console.log(`short wave detected: ${wavelength}`);
                } else if (wavelength > 80) {
                    // but its really long?
                    console.log(`long wave detected: ${wavelength}`);
                }
                wavelength = 0;
            }
        }
    }

    /** @param {AsyncGenerator<number>} wavelengths  */
    async * getBytes(wavelengths) {
        let waveCount = 0;
        let idle = true;
        let bitCount = 0;
        let byteValue = 0;
        let waves = [];
        let longCount = 0;
        for await (const wl of wavelengths) {
            // wait for leading zero
            idle = idle && wl < THRESHOLD;
            if (idle) continue;
            
            // build a bit
            waveCount += 1;
            if (wl >= THRESHOLD) {
                longCount += 1;
            }
            waves.push(wl);
            let bit;
            if (waveCount == 8) {
                bit = 1;
            } else if (waveCount == 4 && longCount >= 2) {
                bit = 0;
            } else {
                continue;
            }
            bitCount += 1;
            waveCount = 0;
            longCount = 0;

            // build a byte
            byteValue = (byteValue >> 1) + (bit << 7);
            if (bitCount === 9) {
                yield byteValue;
                bitCount = 0;
                idle = true;
                if (
                    byteValue != 0x0a && 
                    (byteValue < 0x20 || byteValue > 0x7f)
                ) {
                    console.log(`weird byte: ${byteValue} (threshold: ${THRESHOLD})`);
                    console.log(waves);
                }
                waves = [];
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
