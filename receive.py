import struct
import wave

import numpy as np
from matplotlib import pyplot

SAMPLE_RATE = 44100
n_frames = 30


def round_by(b, n):
    return (n + b / 2) // b * b

with wave.open('out.wav', 'r') as f:
    f.readframes(22050) # skip 0.5s

    amplitudes = []
    for sample, in struct.iter_unpack('<h', f.readframes(n_frames)):
        amplitudes.append(sample / (2 ** 15 - 1))
    n = len(amplitudes)

    # pyplot.plot(amplitudes)
    # pyplot.show()

    yf = [ abs(h) for h in np.fft.rfft(amplitudes) ]
    y_max = max(yf)
    yf = [ y / y_max for y in yf ]
    xf = np.fft.rfftfreq(n, 1 / SAMPLE_RATE)

    peaks = []
    high = 0.5
    low = 0.2
    peak_x = 0
    peak_y = 0
    climbing = False
    for x, y in zip(xf, yf):
        if climbing and y > peak_y:
            peak_x = x
            peak_y = y
        if climbing and y < low:
            peaks.append(peak_x)
            peak_x = 0
            peak_y = 0
            climbing = False
        if not climbing and y > high:
            climbing = True
    print(peaks)

    pyplot.plot(xf, yf)
    # pyplot.xlim(0, 5000)
    pyplot.show()
