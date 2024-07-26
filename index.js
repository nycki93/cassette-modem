function main() {
    const mainDiv = document.getElementById('main');
    mainDiv.innerHTML += '<p>Hello from JS!</p>';
    mainDiv.innerHTML += '<button id="start">start</button>'
    const startButton = document.getElementById('start');
    startButton.onclick = start;
}


// Seems to fail after the first chunk; the remaining chunks don't have headers:
// https://stackoverflow.com/questions/64744309/how-can-i-get-a-continuous-stream-of-samples-from-the-javascript-audioapi

async function start() {
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(mic);
    const audioContext = new AudioContext();
    const reader = new FileReader();

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
        const bytes = new Uint8Array(await e.data.slice(256).arrayBuffer());
        console.log(bytes);
    }

    recorder.start(1000);
    console.log('started');
    await new Promise(r => setTimeout(r, 10_000));
    recorder.stop();
    console.log('stopped');
}

main();
