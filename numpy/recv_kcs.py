import struct
import wave

import numpy as np
from matplotlib import pyplot

SAMPLE_RATE = 44100
FRAME_LENGTH = 300
MARK = 2400
SPACE = 1200

FFT_WINDOW = FRAME_LENGTH // 5
SILENCE_THRESHOLD = 0.01

def nearest_index(array, value):
    diffs = [abs(a - value) for a in array]
    return diffs.index(min(diffs))

BINS = np.fft.rfftfreq(FFT_WINDOW, 1 / SAMPLE_RATE)
MARK_BIN = nearest_index(BINS, MARK)
SPACE_BIN = nearest_index(BINS, SPACE)

def read_bit(frames):
    samples = []
    for sample, in struct.iter_unpack('<h', frames):
        samples.append(sample / (2 ** 15 - 1))
    if max(samples) < SILENCE_THRESHOLD:
        return -1
    yf = [ abs(h) for h in np.fft.rfft(samples) ]
    i = yf.index(max(yf))
    if i == SPACE_BIN: return 0
    if i == MARK_BIN: return 1
    # bad bit
    return -2

def read_byte(bits):
    a = 0
    for b in reversed(bits):
        a *= 2
        a += b
    return a

def read_wave(filename):
    errors = 0
    with wave.open(filename, 'r') as f:
        byte_index = -1
        bits = None
        prev = None
        bit = 0
        while True:
            frames = f.readframes(FFT_WINDOW)
            if not frames or len(frames) < FFT_WINDOW: break
            
            t = read_bit(frames)
            if t < 0: 
                # bad read
                continue
            prev, bit = bit, t

            if byte_index == -1 and prev == 1 and bit == 0:
                # start of byte!
                bits = [0]
                byte_index = 0
                f.readframes(FRAME_LENGTH - FFT_WINDOW)
                continue

            if byte_index >= 0 and byte_index <= 9:
                # reading a byte
                bits.append(bit)
                byte_index += 1
                f.readframes(FRAME_LENGTH - FFT_WINDOW)
                continue

            if byte_index > 9:
                # end of byte
                if sum(bits[:10]) % 2 == 1:
                    errors += 1
                byte = read_byte(bits[1:9])
                print(chr(byte), end='')
                bits = None
                byte_index = -1
                continue
    print() 
    return errors

if __name__ == '__main__':
    read_wave('out.wav')
    err = read_wave('in.wav')
    print(f'errors detected: {err}')
