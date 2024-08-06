class WorkletEncoder extends AudioWorkletProcessor {
    t = 0;
    
    process(_inputs, outputs) {
        const output = outputs[0];
        const length = output[0].length;
        for (let i = 0; i < length; i += 1) {
            const sample = (this.t < 64) ? 1.0 : -1.0;
            output[0][i] = sample;
            this.t += 1;
            if (this.t > 128) this.t = 0;
        }

        return true;
    }
}

registerProcessor('worklet-encoder', WorkletEncoder);
