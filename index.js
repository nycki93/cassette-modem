function main() {
    // Not allowed to get microphone before first user input.
    const mainDiv = document.getElementById('main');
    mainDiv.innerHTML += '<button id="start">start</button>'
    const startButton = document.getElementById('start');
    startButton.onclick = start;
}

async function start() {
    const audioContext = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const micNode = audioContext.createMediaStreamSource(stream);
    await audioContext.audioWorklet.addModule('worklet-decoder.js');
    const decoder = new AudioWorkletNode(audioContext, 'worklet-decoder');
    micNode.connect(decoder);
    decoder.port.onmessage = (ev) => console.log(ev.data);
    await new Promise(r => setTimeout(r, 5_000));
    micNode.disconnect(decoder);
}

main();
