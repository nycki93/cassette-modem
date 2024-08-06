let isTransmitting = false;
let txStopCallback = () => {};
let isReceiving = false;
let rxStopCallback = () => {};

function main() {
    document.getElementById('tx-start').onclick = txStart;
    document.getElementById('tx-stop').onclick = txStop;
    document.getElementById('tx-stop').disabled = true;
    document.getElementById('rx-start').onclick = rxStart;
    document.getElementById('rx-stop').onclick = rxStop;
    document.getElementById('rx-stop').disabled = true;
    document.getElementById('rx-clear').onclick = rxClear;
}

async function txStart() { 
    if (isTransmitting) return;

    const audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule('worklet-encoder.js');
    const encoder = new AudioWorkletNode(audioContext, 'worklet-encoder');
    encoder.connect(audioContext.destination);
    document.getElementById('tx-start').disabled = true;
    document.getElementById('rx-start').disabled = true;
    document.getElementById('tx-stop').disabled = false;
    isTransmitting = true;

    txStopCallback = () => {
        encoder.disconnect(audioContext.destination);
        encoder.port.onmessage = undefined;
        document.getElementById('tx-start').disabled = false;
        document.getElementById('rx-start').disabled = false;
        document.getElementById('tx-stop').disabled = true;
        isTransmitting = false;
    }

    const txText = document.getElementById('tx-textarea');
    encoder.port.postMessage(txText.value);

    const rxText = document.getElementById('rx-textarea');
    rxText.value = '';
    encoder.port.onmessage = (ev) => {
        const { data } = ev;
        if (data.text) {
            rxText.value += data.text;
        }
        if (data.done) {
            rxText.value += '\n\ndone!';
            txStopCallback();
        }
    };
}

function txStop() { 
    txStopCallback();
}

async function rxStart() {
    if (isReceiving) return;
    const audioContext = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: false,
    }});
    const micNode = audioContext.createMediaStreamSource(stream);
    await audioContext.audioWorklet.addModule('worklet-decoder.js');
    const decoder = new AudioWorkletNode(audioContext, 'worklet-decoder');

    const rxText = document.getElementById('rx-textarea');
    decoder.port.onmessage = (ev) => {
        const byte = ev.data;
        let char = '.';
        if (byte == 0x0a) {
            char = '\n';
        } else if (byte >= 0x20 && byte < 0x7f) {
            char = String.fromCharCode(byte);
        }
        rxText.value += char;
    }
    
    isReceiving = true;
    document.getElementById('rx-start').disabled = true;
    document.getElementById('tx-start').disabled = true;
    document.getElementById('rx-stop').disabled = false;
    micNode.connect(decoder);
    rxStopCallback = () => {
        micNode.disconnect(decoder);
        isReceiving = false;
        document.getElementById('rx-start').disabled = false;
        document.getElementById('tx-start').disabled = false;
        document.getElementById('rx-stop').disabled = true;
    }
}

function rxStop() { 
    rxStopCallback();
}

function rxClear() {
    const rxText = document.getElementById('rx-textarea');
    rxText.value = '';
}

main();
