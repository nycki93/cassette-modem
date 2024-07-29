function main() {
    // Not allowed to get microphone before first user input.
    const startButton = document.getElementById('startButton');
    startButton.onclick = start;
}

async function start() {
    const audioContext = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: false,
    } });
    const micNode = audioContext.createMediaStreamSource(stream);
    await audioContext.audioWorklet.addModule('worklet-decoder.js');
    const decoder = new AudioWorkletNode(audioContext, 'worklet-decoder');

    const textarea = document.getElementById('textarea');
    decoder.port.onmessage = (ev) => {
        const byte = ev.data;
        let char = '.';
        if (byte == 0x0a) {
            char = '\n';
        } else if (byte >= 0x20 && byte < 0x7f) {
            char = String.fromCharCode(byte);
        }
        textarea.value += char;
    }
    
    micNode.connect(decoder);
    // await new Promise(r => setTimeout(r, 5_000));
    // micNode.disconnect(decoder);
}

main();
