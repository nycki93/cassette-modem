import struct
import wave

import numpy as np
from matplotlib import pyplot

SAMPLE_RATE = 44100
FFT_WINDOW = 32

with wave.open('out.wav', 'r') as f:
    f.readframes(1234) # kill some time

    samples = []
    for sample, in struct.iter_unpack('<h', f.readframes(FFT_WINDOW)):
        samples.append(sample / (2 ** 15 - 1))

    yf = [ abs(h) for h in np.fft.rfft(samples) ]
    xf = np.fft.rfftfreq(FFT_WINDOW, 1 / SAMPLE_RATE)

    print(xf)

    pyplot.scatter(xf, yf)
    pyplot.xlim(0, 12000)
    pyplot.show()
