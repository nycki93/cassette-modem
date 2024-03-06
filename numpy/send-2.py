import math
import struct
import wave

import numpy as np

SAMPLE_RATE = 44100
FRAME_LENGTH = SAMPLE_RATE // 100

FFT_WINDOW = 64
BINS = [ 2 * i + 4 for i in range(10) ]
DATA = 8
CONTROL = 8
CLOCK = 9

TUNING_A = 440

def note(n):
    return TUNING_A * 2 ** (n / 12)

FREQS = np.fft.rfftfreq(FFT_WINDOW, 1 / SAMPLE_RATE)
# NOTES = [ 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 ]
# FREQS = [ 
#     1300, 3100, 5300, 7300, 9300, 
#     11300, 13300, 15100, 17300, 19300,
# ]

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

    for t in range(FRAME_LENGTH):
        freqs = [FREQS[i] for i in BINS]
        h = sum(sine(1 / len(BINS), f, t) for f in freqs)
        f.writeframes(wav_sample(h))
    
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
