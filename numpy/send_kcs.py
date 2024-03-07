import math
import struct
import wave

SAMPLE_RATE = 44100
FRAME_LENGTH = 300
MARK = 2400
SPACE = 1200

def sine(amp, freq, t):
    return amp * math.sin(2 * math.pi * freq * t / SAMPLE_RATE)

def wav_sample(h):
    return struct.pack('<h', int(h * (2 ** 15 - 1)))

def pad_byte(n):
    """bit pattern: 0 xxxx xxxx p 11"""
    bits = [0]
    for _ in range(8):
        bits.append(n % 2)
        n = n // 2
    bits += [sum(bits) % 2, 1, 1]
    return bits

def bit_stream(data):
    yield from [1, 1]
    for d in data:
        yield from pad_byte(ord(d))

def main():
    with wave.open('out.wav', 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        for b in bit_stream('Hello World! lorem ipsum dolor sit amet.'):
            for t in range(FRAME_LENGTH):
                h = sine(1, b and MARK or SPACE, t)
                f.writeframes(wav_sample(h))

if __name__ == '__main__':
    main()
