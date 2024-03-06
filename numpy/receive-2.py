import struct
import wave

import numpy as np
from matplotlib import pyplot

SAMPLE_RATE = 44100

FFT_WINDOW = 64
BINS = [ 4, 6, 8, 10, 12, 14, 16, 18, 20, 22 ]
DATA = 8
CONTROL = 8
CLOCK = 9

def read_bits(f):
    samples = []
    for sample, in struct.iter_unpack('<h', f.readframes(FFT_WINDOW)):
        samples.append(sample)
    yf = [ abs (h) for h in np.fft.rfft(samples) ]
    data = [yf[i] for i in BINS]
    cutoff = max(yf) * 0.5
    bits = []
    for a in data:
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

def recv_file(f):
    bits = read_bits(f)
    stable = False
    while True:
        try:
            new_bits = read_bits(f)
        except:
            print()
            return
        if new_bits[CONTROL] == 1:
            continue
        if not stable and new_bits == bits:
            stable = True
            bits = new_bits
            num = bits_to_int(bits[:DATA])
            print(chr(num), end='')
        if stable and new_bits == bits:
            # print('=', end='')
            continue
        if new_bits != bits:
            bits = new_bits
            stable = False

if __name__ == '__main__':
    with wave.open('out.wav', 'r') as f:
        recv_file(f)
    with wave.open('in.wav', 'r') as f:
        recv_file(f)
