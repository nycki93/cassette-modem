import math
import struct
import wave

import numpy as np

SAMPLE_RATE = 44100
FRAME_LENGTH = SAMPLE_RATE // 100

FFT_WINDOW = 30
BINS = [ 3, 5, 7, 11, 13 ]
DATA = 4
CLOCK = -1

FREQS = np.fft.rfftfreq(FFT_WINDOW, 1 / SAMPLE_RATE)

def sine(amp, freq, t):
    return amp * math.sin(2 * math.pi * freq * t / SAMPLE_RATE)

def wav_sample(h):
    return struct.pack('<h', int(h * (2 ** 15 - 1)))

def int_to_freqs(a):
    result = []
    for i in BINS[:DATA]:
        if a % 2: result.append(FREQS[i])
        a = a // 2
    return result

with wave.open('out.wav', 'w') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(SAMPLE_RATE)

    for t in range(FRAME_LENGTH):
        freqs = [FREQS[i] for i in BINS]
        h = sum(sine(1 / len(BINS), f, t) for f in freqs)
        f.writeframes(wav_sample(h))
    
    data = [ 
        15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
        1, 1, 2, 3, 5, 8, 13,
    ]

    for i, d in enumerate(np.array(data).view(int)):
        print(d, end=' ')
        freqs = int_to_freqs(d)
        if (i % 2 == 0):
            freqs = [*freqs, FREQS[BINS[CLOCK]]]
        for t in range(FRAME_LENGTH):
            h = sum(sine(1 / len(BINS), f, t) for f in freqs)
            f.writeframes(wav_sample(h))
