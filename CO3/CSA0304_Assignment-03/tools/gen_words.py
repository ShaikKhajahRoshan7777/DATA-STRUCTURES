#!/usr/bin/env python3
"""Generates the synthetic dictionary used in Q7 (200,000 unique lowercase words, random order).

The assignment does not supply a word list, so this script builds a reproducible stand-in made of
Tamil-style transliterated syllables with common endings (like an agglutinative language).
Replace Q7_Dictionary/words_200k.txt with a real word list to repeat the experiment on real data.
"""
import random, sys
random.seed(2026)
cons = ["k","t","p","m","n","r","l","v","s","y","th","ng","ch","d","g","b","zh","j"]
vows = ["a","aa","i","ee","u","oo","e","o","ai"]
codas = ["", "", "", "n", "m", "l", "r", "k"]
suffix = ["", "", "", "kal", "um", "il", "ai", "udan", "aga", "ukku", "athu", "inra", "ppadi", "nthu"]

def syllable():
    return random.choice(cons) + random.choice(vows) + random.choice(codas)

def word():
    w = "".join(syllable() for _ in range(random.choice([1, 2, 2, 3, 3])))
    return w + random.choice(suffix)

target = int(sys.argv[1]) if len(sys.argv) > 1 else 200000
seen = set()
while len(seen) < target:
    w = word()
    if 3 <= len(w) <= 18:
        seen.add(w)
words = list(seen)
random.shuffle(words)
open("Q7_Dictionary/words_200k.txt", "w").write("\n".join(words) + "\n")
open("Q7_Dictionary/sample_1000.txt", "w").write("\n".join(words[:1000]) + "\n")
print(len(words), "words written; sample:", words[:8])
