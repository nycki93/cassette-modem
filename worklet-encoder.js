// defined by worklet context
const SAMPLE_RATE = /** @type {number} */ (sampleRate);

function squareWave(amplitude, frequency, pulses=1) {
    const samples = /** @type {number[]} */ ([]);
    const halfwave = Math.floor(SAMPLE_RATE / frequency / 2);
    for (let i = 0; i < pulses; i += 1) {
        for (let j = 0; j < halfwave; j += 1) {
            samples.push(amplitude);
        }
        for (let j = 0; j < halfwave; j += 1) {
            samples.push(-1 * amplitude);
        }
    }
    return samples;
}

class WorkletEncoder extends AudioWorkletProcessor {
    data = 'hello world';
    buffer = [];

    encodeChar() {
        if (this.data.length === 0) return;
        const char = this.data.charAt(0);
        const byte = this.data.charCodeAt(0);
        this.data = this.data.slice(1);
        
        const bits = [0];
        for (let i = 0; i < 8; i += 1) {
            bits.push((byte & (1 << i)) ? 1 : 0);
        }
        bits.push(1);
        
        const samples = bits.flatMap((bit) => {
            if (bit) {
                return squareWave(1.0, 2400, 8);
            } else {
                return squareWave(1.0, 1200, 4);
            }
        })
        this.buffer = this.buffer.concat(samples);
        return char;
    }
    
    process(_inputs, outputs) {
        const output = outputs[0];
        const length = output[0].length;
        while (this.buffer.length < length) {
            const char = this.encodeChar();
            if (char) {
                this.port.postMessage({ char });
            } else {
                this.port.postMessage({ done: true });
                break;
            }
        }
        const samples = this.buffer.splice(0, length);
        for (const channel of output) {
            for (let i = 0; i < length; i += 1) {
                channel[i] = samples[i];
            }
        }

        return true;
    }
}

registerProcessor('worklet-encoder', WorkletEncoder);
