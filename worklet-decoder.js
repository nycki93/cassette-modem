class WorkletDecoder extends AudioWorkletProcessor {
    first = true;

    process(inputs) {
        if (this.first) {
            const channels = inputs[0];
            const samples = channels[0];
            this.port.postMessage(`channels: ${channels.length}`);
            this.port.postMessage(`samples: ${samples.length}`);
            this.first = false;
        }
        return true;
    }
}

registerProcessor('worklet-decoder', WorkletDecoder);
