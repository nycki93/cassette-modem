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
    cutoff = max(yf) / 2
    bits = []
    for a in yf:
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

with wave.open('cassette-modem-test.wav', 'r') as f:
    f.readframes(10)
    bits = read_bits(f)
    stable = False
    while True:
        try:
            new_bits = read_bits(f)
        except:
            exit(0)
        if not stable and new_bits == bits:
            stable = True
            bits = new_bits
            num = bits_to_int(bits[3:11])
            print(chr(num), end='')
        if stable and new_bits == bits:
            print('=', end='')
            continue
        if new_bits != bits:
            bits = new_bits
            stable = False
