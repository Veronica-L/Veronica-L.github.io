"""Generate three original, quiet ambient sketches for this prototype."""
from array import array
from pathlib import Path
import math
import wave

ROOT = Path(__file__).parent / 'assets'
RATE = 22050
SECONDS = 32
SCORES = {
    'forest-letter': [(130.81, 196, 261.63), (110, 164.81, 220), (174.61, 220, 261.63), (98, 146.83, 196)],
    'evening-breeze': [(146.83, 220, 293.66), (123.47, 185, 246.94), (196, 246.94, 293.66), (110, 164.81, 220)],
    'after-sunset': [(110, 164.81, 220), (87.31, 130.81, 174.61), (130.81, 196, 261.63), (98, 146.83, 196)],
}

for name, score in SCORES.items():
    samples = array('h')
    for i in range(RATE * SECONDS):
        t = i / RATE
        section = min(int(t / 8), 3)
        u = (t % 8) / 8
        transition = (1 - math.cos(math.pi * min(u / 0.2, 1))) / 2
        previous = score[max(section - 1, 0)]
        current = score[section]
        sample = 0.0
        for chord, weight in [(previous, 1 - transition), (current, transition)]:
            for j, frequency in enumerate(chord):
                shimmer = 1 + 0.002 * math.sin(2 * math.pi * 0.09 * t + j)
                sample += weight * (math.sin(2 * math.pi * frequency * t + 0.15 * math.sin(t * 0.3)) * 0.7
                                    + math.sin(2 * math.pi * frequency * 2 * t) * 0.16) * shimmer
        envelope = min(t / 3, 1, (SECONDS - t) / 4)
        breathing = 0.82 + 0.18 * math.sin(t * 0.5)
        samples.append(int(sample * max(envelope, 0) * breathing * 3800))
    with wave.open(str(ROOT / (name + '.wav')), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(samples.tobytes())
    print(name + '.wav generated')
