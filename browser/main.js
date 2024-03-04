const A_TUNING_HZ = 440;
const MIDDLE_C = -9;

const audio = new AudioContext();

const gainNode = audio.createGain();
gainNode.gain.value = 1;
gainNode.connect(audio.destination);

function note(n) {
    return A_TUNING_HZ * Math.pow(2, n / 12);
}

document.getElementById('play').onclick = () => {
    const sineNode = audio.createOscillator();
    sineNode.type = 'sine';
    sineNode.frequency.value = note(MIDDLE_C);
    sineNode.connect(gainNode);
    sineNode.start();
    sineNode.stop(audio.currentTime + 0.500);
    setTimeout(() => sineNode.disconnect(), 500);
}
