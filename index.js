let isTransmitting = false;
let txStopCallback = () => {};
let isReceiving = false;
let rxStopCallback = () => {};
let deviceInputs = {};
let deviceOutputs = {};
/** @type {MediaStream | undefined} */
let rxStream;
let canSetSink = true;

function main() {
    const ctx = new AudioContext();
    if (!ctx.setSinkId) {
        canSetSink = false;
        document.getElementById('tx-select').disabled = true;
    }

    document.getElementById('tx-start').onclick = txStart;
    document.getElementById('tx-stop').onclick = txStop;
    document.getElementById('tx-stop').disabled = true;
    document.getElementById('rx-start').onclick = rxStart;
    document.getElementById('rx-stop').onclick = rxStop;
    document.getElementById('rx-stop').disabled = true;
    document.getElementById('rx-clear').onclick = rxClear;
    document.getElementById('get-devices').onclick = getDevices;
}

async function txStart() { 
    if (isTransmitting) return;

    const sinkId = document.getElementById('tx-select').value;
    const audioContext = new AudioContext({ sinkId });
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
    if (!rxStream) {
        await getDevices();
    }
    rxStream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: false,
        deviceId: rxSelect.value,
    }});
    rxSelect.value = rxStream.getAudioTracks()[0].getSettings().deviceId;

    const audioContext = new AudioContext();
    const micNode = audioContext.createMediaStreamSource(rxStream);
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

async function getDevices() {
    if (!rxStream) {
        rxStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    const deviceList = await navigator.mediaDevices.enumerateDevices();
    deviceInputs = {};
    const rxSelect = document.getElementById('rx-select');
    rxSelect.innerHTML = '';
    for (const device of deviceList) {
        if (device.kind !== 'audioinput') continue;
        const id = device.deviceId;
        const label = device.label;
        deviceInputs[id] = device;
        rxSelect.innerHTML += `<option value="${id}">${label}</option>`;
    }
    rxSelect.value = rxStream.getAudioTracks()[0].getSettings().deviceId;
    
    if (!canSetSink) return;
    deviceOutputs = {};
    const txSelect = document.getElementById('tx-select');
    txSelect.innerHTML = '';
    for (const device of deviceList) {
        if (device.kind !== 'audiooutput') continue;
        const id = device.deviceId;
        const label = device.label;
        deviceOutputs[id] = device;
        txSelect.innerHTML += `<option value="${id}">${label}</option>`;
    }
}

main();
