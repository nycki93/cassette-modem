const A_TUNING_HZ = 440;

// middle C is 9 steps below middle A apparently?
const C = -9;
const D = C+2;
const Ds = C+3;
const E = C+4;
const G = C+7;

const SONG = [ C, C, E, G, C, C, E, G, D, C, Ds, D, C ];

function note(n) {
    return A_TUNING_HZ * Math.pow(2, n / 12);
}

function main() {
    const audio = new AudioContext();

    const gainNode = audio.createGain();
    gainNode.gain.value = 1;
    gainNode.connect(audio.destination);

    const sineNode = audio.createOscillator();
    sineNode.type = 'sine';
    sineNode.connect(gainNode);

    let i;
    for (i = 0; i < SONG.length; i++) {
        const t = 0.250 * i;
        gainNode.gain.setValueAtTime(1, t);
        sineNode.frequency.setValueAtTime(note(SONG[i]), t);
        gainNode.gain.setValueAtTime(0, t + 0.200);
    }
    
    sineNode.start();
    sineNode.stop(audio.currentTime + 0.250 * i);
    setTimeout(() => sineNode.disconnect(), 250 * i);
}

document.getElementById('start').onclick = main;
