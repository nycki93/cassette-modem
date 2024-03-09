import math
import struct
import wave

SAMPLE_RATE = 22050
TEMPO = 240
BEAT = SAMPLE_RATE * 60 // TEMPO

A_TUNING = 440
MIDDLE_C = -9
SCALE = [ 
     0,  2,  4,  5,  7,  9, 11,
    12, 14, 16, 17, 19, 21, 23,
    24, 26,
]

def note_to_freq(n):
    return A_TUNING * (2 ** (n / 12))

def char_to_note(c):
    note = SCALE[ord(c) % 16] + MIDDLE_C - 12
    pitch = note_to_freq(note)
    delay = (ord(c) // 16 + 1) * BEAT // 8
    return pitch, delay

def sine(amp, freq, t):
    return amp * math.sin(2 * math.pi * freq * t / SAMPLE_RATE)

def wav_sample(h):
    return struct.pack('<h', int(h * (2 ** 15 - 1)))

def write_wav(filename, text):
    with wave.open(filename, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        for c in text:
            pitch, delay = char_to_note(c)
            for t in range(delay):
                s = sine(0.5, pitch, t)
                w.writeframes(wav_sample(s))

if __name__ == '__main__':
    write_wav('fun.wav', 'Hello! Hello! I am text, I am, I am!')
                
