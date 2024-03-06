import math
import struct
import wave

import numpy as np

SAMPLE_RATE = 44100
FRAME_LENGTH = SAMPLE_RATE // 300
FFT_WINDOW = 42

bins = np.fft.rfftfreq(FFT_WINDOW, 1 / SAMPLE_RATE)[1:11]

def sine(amp, freq, t):
    return amp * math.sin(2 * math.pi * freq * t / SAMPLE_RATE)

def wav_sample(h):
    return struct.pack('<h', int(h * (2 ** 15 - 1)))

def int_to_freqs(a):
    result = []
    for freq in bins:
        if a % 2: result.append(freq)
        a = a // 2
    return result

with wave.open('out.wav', 'w') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(SAMPLE_RATE)
    
    data = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]

    for d in data:
        freqs = int_to_freqs(d)
        for t in range(FRAME_LENGTH):
            h = sum(sine(0.1, f, t) for f in freqs)
            f.writeframes(wav_sample(h))
