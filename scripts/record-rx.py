#!/usr/bin/env python3
"""Record a prescription of the infirmary read aloud, on this Mac.

    python3 scripts/record-rx.py fight yifan     # which hurt: fight | hurt | miss | tired; who reads: yifan | jingyi

Starts recording from the default microphone at once; press Enter to stop (or it stops at 5 min).
Saves public/media/clinic/<hurt>-<reader>.m4a; the "hear it" button on that prescription appears
by itself. Needs: pip install sounddevice soundfile  (afconvert is built into macOS).
"""
import os, subprocess, sys, threading
import numpy as np, sounddevice as sd, soundfile as sf

hurt = (sys.argv[1] if len(sys.argv) > 1 else '').lower()
reader = (sys.argv[2] if len(sys.argv) > 2 else '').lower()
if hurt not in ('fight', 'hurt', 'miss', 'tired'): sys.exit('which hurt? fight, hurt, miss or tired')
if reader not in ('yifan', 'jingyi'): sys.exit('who is reading? yifan or jingyi')
folder = os.path.join(os.path.dirname(__file__), '..', 'public', 'media', 'clinic')
name = f'{hurt}-{reader}'
wav = f'/tmp/{name}.wav'; m4a = os.path.join(folder, f'{name}.m4a')
if os.path.exists(m4a) and input(f'{name}.m4a exists; record over it? [y/N] ').strip().lower() != 'y': sys.exit('kept the old one')

RATE, MAX = 44100, 300
chunks, stop = [], threading.Event()
def cb(indata, frames, t, status): chunks.append(indata.copy())
print(f'● recording {name}… read the letter now. Press Enter to stop.')
with sd.InputStream(samplerate=RATE, channels=1, callback=cb):
    threading.Thread(target=lambda: (sys.stdin.readline(), stop.set()), daemon=True).start()
    stop.wait(MAX)
audio = np.concatenate(chunks) if chunks else np.zeros((1, 1), dtype='float32')
level = np.abs(audio[:, 0]); idx = np.where(level > 0.01)[0]
if len(idx): audio = audio[max(0, idx[0] - RATE // 4): min(len(audio), idx[-1] + RATE // 2)]
sf.write(wav, audio, RATE)
subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '96000', wav, m4a], check=True)
os.remove(wav)
print(f'saved {os.path.relpath(m4a)}  ({len(audio) / RATE:.1f} s). Commit and push; nothing else to change.')
