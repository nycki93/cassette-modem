import struct
import wave

import numpy as np
from matplotlib import pyplot

SAMPLE_RATE = 44100
FFT_WINDOW = 42

def read_bits(f):
    samples = []
    for sample, in struct.iter_unpack('<h', f.readframes(FFT_WINDOW)):
        samples.append(sample)
    yf = [ abs (h) for h in np.fft.rfft(samples) ]
    xf = np.fft.rfftfreq(FFT_WINDOW, 1 / SAMPLE_RATE)
    cutoff = max(yf) / 2
    bits = []
    for a in yf[1:11]:
        if a > cutoff:
            bits.append(1)
        else:
            bits.append(0)
    return bits

with wave.open('out.wav', 'r') as f:
    f.readframes(1234) # intentional desync
    bits = read_bits(f)
    print(bits)
