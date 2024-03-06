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

def bits_to_int(bits):
    a = 0
    for b in reversed(bits):
        a *= 2
        a += b and 1 or 0
    return a

with wave.open('cassette_out.wav', 'r') as f:
    f.readframes(10) # intentional desync
    bits = read_bits(f)
    stable = False
    while True:
        new_bits = read_bits(f)
        if not stable and new_bits == bits:
            stable = True
            bits = new_bits
            print(bits_to_int(bits))
        if stable and new_bits == bits:
            continue
        if new_bits != bits:
            bits = new_bits
            stable = False
