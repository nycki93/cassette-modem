import math
import struct
import wave

import numpy as np

SAMPLE_RATE = 44100
FRAME_LENGTH = SAMPLE_RATE // 100

FFT_WINDOW = 64
BINS = [ 4, 6, 8, 10, 12, 14, 16, 18, 20, 22 ]
DATA = 8
CONTROL = 8
CLOCK = 9

FREQS = np.fft.rfftfreq(FFT_WINDOW, 1 / SAMPLE_RATE)

def sine(amp, freq, t):
    return amp * math.sin(2 * math.pi * freq * t / SAMPLE_RATE)

def wav_sample(h):
    return struct.pack('<h', int(h * (2 ** 15 - 1)))

def int_to_freqs(a):
    result = []
    for i in BINS:
        if a % 2: result.append(FREQS[i])
        a = a // 2
    return result

with wave.open('out.wav', 'w') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(SAMPLE_RATE)
    
    data = [ 
        "Hello, World! lorem ipsum dolor sit amet."
    ]

    for i, d in enumerate(np.array(data).view(int)):
        print(d, end=' ')
        freqs = int_to_freqs(d)[:DATA]
        if (i % 2 == 0):
            freqs = [*freqs, FREQS[BINS[CLOCK]]]
        for t in range(FRAME_LENGTH):
            h = sum(sine(1 / len(BINS), f, t) for f in freqs)
            f.writeframes(wav_sample(h))
