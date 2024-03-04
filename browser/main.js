const A_TUNING_HZ = 440;

const audio = new AudioContext();

const gainNode = audio.createGain();
gainNode.gain.value = 1;
gainNode.connect(audio.destination);

function note_hz(n) {
    return A_TUNING_HZ * Math.pow(2, n / 12);
}

const middleC = note_hz(-9);

const sineNode = audio.createOscillator();
sineNode.frequency.value = middleC;
sineNode.connect(gainNode);

document.getElementById('play').onclick = () => {
    sineNode.start();
    sineNode.stop(audio.currentTime + 2);
}
