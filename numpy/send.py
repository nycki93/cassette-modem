import math
import struct
import wave

SAMPLE_RATE = 44100
LENGTH_MS = 5000
FREQ_A = 440

def sine(amplitude, frequency, t):
    return amplitude * math.sin(2 * math.pi * frequency * t / SAMPLE_RATE)

def note(n):
    return FREQ_A * (2 ** (n / 12))

def wav_sample(h):
    return struct.pack('<h', int(h * (2 ** 15 - 1)))

with wave.open('out.wav', 'w') as f:
    f.setnchannels(1) # mono
    f.setsampwidth(2) # 16-bit samples
    f.setframerate(SAMPLE_RATE)
    freqs = [ 500 + 4500 * x / 17 for x in range(17) ]
    n = len(freqs)
    print(freqs)
    for t in range(int(LENGTH_MS * SAMPLE_RATE / 1000)):
        h = sum(sine(1/n, f, t) for f in freqs)
        f.writeframes(wav_sample(h))