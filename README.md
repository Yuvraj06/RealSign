# realsign

A browser-based American Sign Language interpreter. Spell to your webcam and it reads the letters back, one at a time, with a confidence figure for each.

Everything runs on the device. There is no inference server, no upload, and no inference runtime either — the model is 18k parameters, so the browser multiplies it directly.

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` and `npm run build` both run `setup:vision` first, which vendors the MediaPipe wasm into `public/` and downloads the hand landmarker (~8MB, once). The letter model is committed.

Open [http://localhost:3000](http://localhost:3000) and press **start camera**. Hold one letter still until it lands; dip your hand briefly between a double letter, and pause for a second to finish the word.

The camera needs a secure context, so use `localhost` or https.

## Scripts

| | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run setup:vision` | Vendor the MediaPipe runtime and tracker model |

## How it works

```
webcam -> MediaPipe hand landmarker   21 landmarks, ~30fps
       -> normalizeHand               mirror, translate, scale, rotate -> 63 values
       -> letter model                63 -> 128 -> 64 -> 24
       -> spelling.ts                 agreement over time -> a committed letter
       -> pause                       1.2s with no hand finishes the word
```

`REALSIGN.md` is the full spec: architecture, the design system, the normalization, and section 14 on exactly what the accuracy figure is worth.

## The model

Trained on data this app recorded. `/record` captures 60 frames of each held letter through the same `normalizeHand` the interpreter uses at inference, which removes an entire class of distribution mismatch: there is one normalization function and no second implementation to drift.

`realsign-letters-1440.json` is that dataset — 24 letters, 60 samples each. To retrain:

```bash
python -m venv .venv && .venv/bin/pip install torch numpy
.venv/bin/python training/train_letters.py --check
```

That writes `src/features/sign-classifier/models/letters.json` and refuses to finish unless the written weights reproduce PyTorch to 1e-6.

**J and Z are not included.** Both are traced in the air rather than held, so a single frame of J is already an I and a frame of Z is a D. They need a model that reads time.

## What it does not do

**The accuracy figure is an upper bound, not a promise.** It scores 99.7% on frames held out of training, and that is much weaker evidence than it sounds. All 60 samples of a letter are consecutive frames of one continuous hold — measured, not assumed: neighbouring samples sit ~3.9× closer together than random pairs of the same letter. So there is one person, one hand, one room and one camera behind every class. A random split scores 100% and means even less; the training script trains one on purpose to show the gap. Section 14 of the spec goes through this properly.

**Doubled letters need a gap.** Once a letter is committed it is latched until the hand visibly moves on, otherwise holding a shape would emit it ten times a second. Spelling HELLO with no gap gives HELO.

**Nothing corrects the spelling.** The reading is exactly the letters that landed. There is no language model turning HELLQ into HELLO, so a misread stays visible rather than being smoothed into something that was never signed.

**No word signs, no facial grammar, no signing space.** Fingerspelling is how ASL handles names and words it has no sign for. It is not how ASL is spoken, and it is a small fraction of the language.

The landing page says all of this too. That is deliberate.
