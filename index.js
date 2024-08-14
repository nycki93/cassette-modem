let isTransmitting = false;
let txStopCallback = () => {};
let isReceiving = false;
let rxStopCallback = () => {};
let inputOptions = {};
/** @type {MediaStream | undefined} */
let rxDevice;

function main() {
    document.getElementById('tx-start').onclick = txStart;
    document.getElementById('tx-stop').onclick = txStop;
    document.getElementById('tx-stop').disabled = true;
    document.getElementById('rx-start').onclick = rxStart;
    document.getElementById('rx-stop').onclick = rxStop;
    document.getElementById('rx-stop').disabled = true;
    document.getElementById('rx-clear').onclick = rxClear;
    document.getElementById('rx-refresh-options').onclick = updateInputOptions;
}

async function txStart() { 
    if (isTransmitting) return;

    const audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule('worklet-encoder.js');
    const encoder = new AudioWorkletNode(audioContext, 'worklet-encoder');

    const txText = document.getElementById('tx-outgoing');
    encoder.port.postMessage({ 
        baudmode: document.getElementById('baudmode').value,
        data: txText.value,
    });

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

    const txEcho = document.getElementById('tx-echo');
    txEcho.value = '';
    encoder.port.onmessage = (ev) => {
        const { data } = ev;
        if (data.text) {
            txEcho.value += data.text;
            txEcho.scrollTop = txEcho.scrollHeight;
        }
        if (data.done) {
            txStopCallback();
        }
    };
}

function txStop() { 
    txStopCallback();
}

async function rxStart() {
    if (isReceiving) return;

    const rxSelect = document.getElementById('rx-select');
    if (!rxDevice) {
        await updateInputOptions();
    }
    rxDevice = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: false,
        deviceId: rxSelect.value,
    }});
    rxSelect.value = rxDevice.getAudioTracks()[0].getSettings().deviceId;

    const audioContext = new AudioContext();
    const micNode = audioContext.createMediaStreamSource(rxDevice);
    const filterNode = new BiquadFilterNode(audioContext, {
        type: 'highpass',
        frequency: '800',
    });
    micNode.connect(filterNode);

    await audioContext.audioWorklet.addModule('worklet-decoder.js');
    const decoder = new AudioWorkletNode(audioContext, 'worklet-decoder');
    decoder.port.postMessage({ 
        baudmode: document.getElementById('baudmode').value,
    });

    const rxText = document.getElementById('rx-incoming');
    decoder.port.onmessage = (ev) => {
        const byte = ev.data;
        let char = '.';
        if (byte == 0x0a) {
            char = '\n';
        } else if (byte >= 0x20 && byte < 0x7f) {
            char = String.fromCharCode(byte);
        }
        rxText.value += char;
        rxText.scrollTop = rxText.scrollHeight;
    }
    
    isReceiving = true;
    document.getElementById('rx-start').disabled = true;
    document.getElementById('tx-start').disabled = true;
    document.getElementById('rx-stop').disabled = false;
    rxSelect.disabled = true;
    filterNode.connect(decoder);
    // micNode.connect(decoder);
    rxStopCallback = () => {
        filterNode.disconnect(decoder);
        // micNode.disconnect(decoder);
        isReceiving = false;
        document.getElementById('rx-start').disabled = false;
        document.getElementById('tx-start').disabled = false;
        document.getElementById('rx-stop').disabled = true;
        rxSelect.disabled = false;
    }
}

function rxStop() { 
    rxStopCallback();
}

function rxClear() {
    const rxText = document.getElementById('rx-incoming');
    rxText.value = '';
}

async function updateInputOptions() {
    if (!rxDevice) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    inputOptions = {};
    const rxSelect = document.getElementById('rx-select');
    rxSelect.innerHTML = '';
    const deviceList = await navigator.mediaDevices.enumerateDevices();
    for (const device of deviceList) {
        if (device.kind !== 'audioinput') continue;
        if (!device.label) continue;
        const id = device.deviceId;
        inputOptions[id] = device.label;
        rxSelect.innerHTML += `<option value="${id}">${device.label}</option>`;
    }
}

main();
