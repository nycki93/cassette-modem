function main() {
    // Not allowed to get microphone before first user input.
    const mainDiv = document.getElementById('main');
    mainDiv.innerHTML += '<button id="start">start</button>'
    const startButton = document.getElementById('start');
    startButton.onclick = start2;
}

/**
 * @param {MediaStream} stream 
 * @returns {Generator<number>}
 */
async function* getSamples(stream) {
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs='})
}

// Seems to fail after the first chunk; the remaining chunks don't have headers:
// https://stackoverflow.com/questions/64744309/how-can-i-get-a-continuous-stream-of-samples-from-the-javascript-audioapi

async function start() {
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(mic, { mimeType: 'audio/webm;codecs='});
    const audioContext = new AudioContext();
    const reader = new FileReader();

    let header;

    /**
     * @returns {Promise<AudioBuffer>}
     */
    function decodeAudio(blob) {
        let resolve;
        const p = new Promise(r => resolve = r);
        const listener = async () => {
            const buffer = reader.result;
            const audio = await audioContext.decodeAudioData(buffer);
            reader.removeEventListener('loadend', listener);
            resolve(audio);
        }
        reader.addEventListener('loadend', listener);
        reader.readAsArrayBuffer(blob);
        return p;
    }

    recorder.ondataavailable = async (e) => {
        // const audio = await decodeAudio(e.data);
        // const samples = audio.getChannelData(0);
        console.log(`got blob of size ${e.data.size}, starting with...`);
        console.log(e);
        const bytes = new Uint8Array(await e.data.slice(128).arrayBuffer());
        const text = [];
        for (const byte of bytes) {
            const char = byte > 31 && byte < 127 ? String.fromCharCode(byte) : '.';
            text.push(char);
        }
        console.log(text.join(''));
    }

    recorder.start(1000);
    console.log('started');
    await new Promise(r => setTimeout(r, 10_000));
    recorder.stop();
    console.log('stopped');
}

// https://web.dev/articles/media-recording-audio
// https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/port

async function start2() {
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
