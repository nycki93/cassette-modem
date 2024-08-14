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

function sineWave(amplitude, frequency, pulses=1) {
    const samples = /** @type {number[]} */ ([]);
    const wavelength = SAMPLE_RATE / frequency;
    for (let i = 0; i < pulses; i += 1) {
        for (let j = 0; j < wavelength; j += 1) {
            samples.push(amplitude * Math.sin(2 * Math.PI * j / wavelength));
        }
    }
    return samples;
}

class WorkletEncoder extends AudioWorkletProcessor {
    data = '';
    buffer = [];
    started = false;
    pitch = 2400;
    mark = () => {};
    space = () => {};

    constructor() {
        super();
        this.port.onmessage = (ev) => {
            const message = ev.data;
            if (message.data) {
                this.data += message.data;
            }

            if (message.baudmode === 'kcs-300') {
                this.mark = (n) => sineWave(1.0, this.pitch, 8 * n);
                this.space = (n) => sineWave(1.0, this.pitch / 2, 4 * n);
            }
            
            if (message.baudmode === 'kcs-1200') {
                this.mark = (n) => sineWave(1.0, this.pitch, 2 * n);
                this.space = (n) => sineWave(1.0, this.pitch / 2, n);
            }

            if (!this.started && !this.data) {
                this.port.postMessage({ done: true });
                return;
            }

            if (!this.started) {
                this.buffer = this.buffer.concat(this.mark(300 * 10));
                this.port.postMessage({ text: 'sending calibration tone for 10 seconds, you may now start recording.\n\n' });
                this.started = true;
            }
        }
    }

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
        bits.push(1);
        
        const samples = bits.flatMap((bit) => (
            bit ? this.mark(1) : this.space(1)
        ));
        this.buffer = this.buffer.concat(samples);
        return char;
    }
    
    process(_inputs, outputs) {
        if (!this.started) {
            return true;
        }

        const output = outputs[0];
        const length = output[0].length;
        while (this.buffer.length < length) {
            const text = this.encodeChar();
            if (text) {
                this.port.postMessage({ text });
            } else {
                this.port.postMessage({ text: '\n\nEOF' });
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
