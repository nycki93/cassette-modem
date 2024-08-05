let isReceiving = false;
let rxStopCallback = () => {};

function main() {
    document.getElementById('tx-start').onclick = txStart;
    document.getElementById('tx-stop').onclick = txStop;
    document.getElementById('rx-start').onclick = rxStart;
    document.getElementById('rx-stop').onclick = rxStop;
    document.getElementById('rx-stop').disabled = true;
    document.getElementById('rx-clear').onclick = rxClear;
}

function txStart() { }

function txStop() { }

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
    document.getElementById('rx-stop').disabled = false;
    micNode.connect(decoder);
    rxStopCallback = () => micNode.disconnect(decoder);
}

function rxStop() { 
    rxStopCallback();
    isReceiving = false;
    document.getElementById('rx-start').disabled = false;
    document.getElementById('rx-stop').disabled = true;
}

function rxClear() {
    const rxText = document.getElementById('rx-textarea');
    rxText.value = '';
}

main();
