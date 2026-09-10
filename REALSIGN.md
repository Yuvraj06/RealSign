# realsign

A browser-based American Sign Language interpreter. A webcam reads the 24 held letters of the manual alphabet and spells out what it sees. Video never leaves the device, and neither does anything derived from it.

---

## 1. Scope

**In scope, and working**

- The 24 held letters of the ASL manual alphabet, read one at a time
- Single hand, single signer, front-facing camera
- Recognition running entirely in the browser, with no inference runtime at all
- Segmentation of a held shape into a committed letter, and of a pause into a finished word

**Explicitly out of scope**

- **J and Z.** Both are traced in the air rather than held. A single frame of J is already an I, and a frame of Z is a D, so they need a model that reads time. Section 8.
- **Word signs.** Same reason, plus a different input. Section 8 covers what that would take.
- **Sentence smoothing.** Nothing rewrites the letters into likelier English. Section 11 explains why that is a decision rather than an omission.
- Continuous signing and full ASL grammar
- Facial grammar and non-manual markers, which carry real meaning in ASL
- Two-handed signs
- Spatial reference and directional verbs, where meaning depends on where a sign is placed and which way it moves
- Multi-signer scenes

State these limits in the interface itself. A tool that is honest about its boundaries reads as more credible than one that overpromises.

---

## 2. Architecture

```
webcam
  -> MediaPipe Tasks (Web)        21 landmarks, ~30fps, client
  -> isFullyVisible               a hand half out of shot is dropped, not read
  -> normalizeHand                mirror, translate, scale, rotate -> 63 values
  -> letter model                 63 -> 128 -> 64 -> 24, three matrix multiplies
  -> spelling.ts                  agreement over time -> one committed letter
  -> pause                        1.2s with no hand closes the word
  -> letters + transcript
```

Everything runs client-side. There is no inference runtime and no server call anywhere in the pipeline, so the privacy claim in the interface is unconditional rather than "except for one step".

Two seams are worth naming. The tracker produces landmarks and knows nothing about letters; the recognizer names letters and knows nothing about cameras. And the model reads exactly one frame, while `spelling.ts` is the only thing that knows frames arrive in a stream — which is what keeps the temporal tuning in one small file that can be reasoned about without React in the way.

### Why landmarks instead of raw pixels

Landmark input keeps the model at 18k parameters and 214KB instead of tens of megabytes, trains on a laptop in under a minute, classifies a frame in 0.07ms, and generalizes across skin tone, lighting and background far better than a pixel-based classifier. This is the single most important architectural decision in the project, and it is what makes a browser-only build possible at all.

### Why there is no inference runtime

Section 7 originally said "convert to TF.js". The model turned out to be three dense layers, so the browser multiplies them itself in about forty lines: a wasm runtime to execute 18k parameters would be two orders of magnitude larger than the thing it executes, and would add a loading state and a failure mode to a file that is smaller than the hero image. `train_letters.py --check` verifies the shipped weights against PyTorch to 1e-6, which is the guarantee the library would otherwise have been providing.

---

## 3. Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router) | Static; nothing in the pipeline needs a server |
| Styling | Tailwind CSS | Fast iteration on a small token set |
| 3D | Three.js via React Three Fiber and Drei | Hand model, scroll-driven camera work |
| Scroll | GSAP ScrollTrigger with Lenis | Reliable pinning and scrubbing |
| Tracking | @mediapipe/tasks-vision | Current supported MediaPipe web build |
| Model runtime | none | Three dense layers, multiplied in TypeScript (section 2) |
| Training | Python, PyTorch | `training/train_letters.py`; exports plain JSON weights |

---

## 4. Design system

### Colour

| Token | Hex | Use |
|---|---|---|
| `cream` | `#FFE9C1` | Hero background only |
| `white` | `#FFFFFF` | Every surface after the hero |
| `forest` | `#22402F` | Primary text, headlines |
| `green` | `#3F7A55` | Buttons, active states, tracked landmarks |
| `sage` | `#EAF1E8` | Soft fills, panel tints, chips |
| `moss` | `#7B8F7E` | Secondary text, captions |
| `clay` | `#C97B4A` | Low-confidence warnings only |

The cream hero gives way to white the moment the interpreter is revealed, so the page moves from cozy and welcoming into calm and functional. Green is the only accent that carries meaning, and clay appears exclusively when the model is unsure. Do not use clay decoratively, because its whole job is to mean "check this letter".

### Type

Rounded and minimal, two families at most.

- **Display:** Quicksand, weights 500 and 600, tight tracking at large sizes
- **Body:** Nunito Sans, weights 400 and 600

Type scale: 14 / 16 / 20 / 28 / 40 / 64 / 96. Body line length stays under 70 characters. No all-caps labels anywhere, since they fight the soft tone.

### Shape and depth

Border radius of 24px on panels, 999px on buttons, 16px on chips. Shadows stay very soft and warm rather than grey, for example `0 12px 32px rgba(34, 64, 47, 0.08)`. Borders are a hairline of `sage` instead of grey.

---

## 5. The hero and the reveal

### Layout

```
+--------------------------------------------------+
|  realsign                        open interpreter |   fixed, mixes over both
|                                                   |
|   Hands to words.                    ,--.         |
|   Show your hands to the           (  3D  )       |
|   camera and realsign spells       ( hand )       |
|   out what you sign.                `--'          |
|                                                   |
|   [ start signing ]                               |
|                                                   |
|                  scroll                           |
+--------------------------------------------------+
              background: #FFE9C1
```

Text sits left, the 3D hand sits right, both vertically centred. Everything is left aligned. The hand is the only object allowed to be visually loud.

### The scroll choreography

One pinned section drives the whole transition. Scroll progress `p` runs from 0 to 1 across roughly two viewport heights of scrolling.

| Element | p = 0 | p = 1 |
|---|---|---|
| Hand position X | right third of the screen | fully off the left edge |
| Hand rotation Y | resting angle | roughly one third turn, so it reads as passing by |
| Hero text | opaque | faded to 0 and lifted 40px, finished by p = 0.45 |
| Cream background | full | crossfaded to white between p = 0.35 and p = 0.75 |
| Interpreter panel | scaled to 0.94, opacity 0 | full scale, opacity 1, arriving by p = 0.85 |

The illusion to preserve is that the hand sweeps across and wipes the marketing layer away, uncovering the tool underneath. Two details make it convincing. First, the interpreter panel starts appearing while the hand is still crossing, so the hand looks like it is doing the revealing rather than simply leaving. Second, the hand keeps a gentle idle rotation the whole time so it never looks like a static image being translated.

Implementation shape:

```js
// three sections: pin the wrapper, scrub everything from one timeline
ScrollTrigger.create({
  trigger: '#hero-wrapper',
  start: 'top top',
  end: '+=200%',
  pin: true,
  scrub: 1,
  onUpdate: (self) => setProgress(self.progress)
});

// inside the R3F canvas
useFrame(() => {
  hand.position.x = lerp(2.4, -6.5, progress);
  hand.position.y = lerp(0, 0.6, progress);
  hand.rotation.y = lerp(0.2, 2.3, progress) + Math.sin(clock.elapsedTime * 0.4) * 0.05;
});
```

Model notes: place the file at `public/models/hand.glb`, load with `useGLTF`, and call `useGLTF.preload` so the first frame is never empty. Keep it under about 3MB, draco-compress if it is larger, and use one soft key light with a warm environment map so the model sits inside the cream rather than floating on it. Respect `prefers-reduced-motion` by skipping the pin entirely and showing the interpreter as a normal section.

---

## 6. The interpreter screen

White background, arranged as two panels with no control between them: the interpreter runs continuously while the camera is on, so there is nothing to press.

**Left, camera.** Video feed mirrored horizontally, the landmark skeleton drawn over it in green, rounded corners, a small status pill reading idle, starting, reading or paused. `starting` covers the camera opening, MediaPipe loading and the weights arriving, so "reading" never appears while no letter could possibly land.

**Right, reading.** The letters committed so far as chips, each with its confidence, then the finished word, then the transcript.

**Confidence rule.** Below 72% the chip turns clay. M, N, S and T are the same fist with the thumb in four places, and R, U and V differ only by how two fingers cross, so surfacing doubt beats a confident wrong answer. The percentage is always written out, so the warning never depends on colour alone.

**A letter has to be held.** Four agreeing samples at 100ms apart, so about four tenths of a second. Less and the shapes made in transit between two letters commit a third one on the way past; more and fingerspelling at any natural speed stops registering.

**The same letter twice needs a gap.** Once committed, a letter is latched and cannot be committed again until the hand has visibly moved on. Without that, holding a shape emits it ten times a second. With it, the L-L in HELLO has to be signed as two deliberate holds — measured, not theorised: driving the real pipeline with recorded frames and no gap between letters spells HELO. A brief dip of the hand clears the latch; a longer pause closes the word. Both are said in the panel, because it is the one place the interface asks the user to do something unobvious.

**Empty states.** Say what to do rather than what is missing. "Show your hand to the camera, then hold one letter still at a time" beats "no data".

---

## 7. Build order

**Phase 1, UI shell. Done.** Full page with a mock recognizer emitting scripted letters on a timer, so every state of the interpreter panel could be designed before a model existed.

**Phase 2, tracking. Done.** MediaPipe wired, skeleton drawn, stable frame rate.

**Phase 3, data. Done.** The recorder at `/record` captured 1,440 samples: 60 frames of each of the 24 held letters, normalized through the same function inference uses.

**Phase 4, model. Done.** `training/train_letters.py` trains a three-layer dense network and writes `models/letters.json`. See section 14 for what its accuracy is and is not worth.

**Phase 5, segmentation and smoothing. Half done.** Segmentation is built and is `lib/spelling.ts`. Smoothing is deliberately not built; section 11.

**Phase 6, word signs. Not started.** Section 8. It needs the recorder extended to capture sequences rather than single poses, and it is what would bring J and Z with it.

**Phase 7, polish.** Permission denial handling and reduced motion are done. Low light warning and a mobile fallback are not.

---

## 8. Word-level signs

Fingerspelling on its own is slow, and it covers a narrow slice of how people actually sign. A small vocabulary of complete word signs makes the tool useful for real exchanges rather than only for spelling out names.

### Why this is a different problem

A letter is a held shape. A word sign is a movement. THANK-YOU and GOOD begin from nearly the same handshape in nearly the same place, and differ almost entirely in the path the hand travels afterwards. A classifier that looks at one frame cannot separate them, because any single frame of either sign is genuinely ambiguous.

So word signs need a model that reads a sequence rather than a pose. This is what the rolling buffer in section 2 is for. Letters read that buffer for stability. Word signs read it for shape.

### Starter vocabulary

Twenty-four one-handed signs, picked for frequency in introductions and for being distinguishable from each other and from the alphabet.

| Group | Signs |
|---|---|
| Greeting | HELLO, GOODBYE, THANK-YOU, PLEASE, SORRY |
| Response | YES, NO, GOOD, BAD, FINE |
| Person | ME, YOU, MY, YOUR, NAME |
| Question | WHAT, WHERE, WHO, HOW |
| Everyday | EAT, DRINK, WATER, HOME, UNDERSTAND |

Two-handed signs are deliberately absent, even though many of the most common signs use two hands. Supporting them changes the input width and the normalization anchor, and that is a separate step rather than a bigger version of this one.

Add a twenty-fifth class, NONE, covering hands at rest, transitions between signs, and the travel before a sign starts. Without a negative class the model fires constantly, because a softmax over twenty-four classes always names one of them. This single class buys more perceived accuracy than any amount of extra data for the real signs.

### Segmentation, letters against words

Both live in the same stream, so the segmenter decides which model to ask.

1. Track landmark velocity, averaged across the last few frames.
2. Velocity low and the pose stable for roughly 300ms, run the letter classifier on the held frame.
3. Velocity rising past a threshold and then falling back, take the span between and run the sequence model over it.
4. Neither, emit nothing.

Say which one happened in the interface. A user who signs a word and gets one chip instead of five needs to understand why, and the status pill is the natural place for it.

### Model

A second model, alongside the letter model rather than replacing it.

| | Letters | Word signs |
|---|---|---|
| Input | 63 values, one frame | 32 frames, 126 values each |
| Architecture | Dense, two hidden layers | GRU or temporal CNN |
| Output | 26 classes | 25 classes, including NONE |
| Samples per class | 40 to 60 | 80 to 120 |

Word signs need more samples per class than letters because signers vary in speed and in how far the hand travels, and that variation has to live in the training set rather than be corrected for at inference time. Record each sign at three speeds.

The 126 values per frame are two hands of 63, with the second hand zero-filled while the vocabulary stays one-handed. Fixing the input width now means adding two-handed signs later does not force a retrain of everything from a different input shape.

### Temporal normalization

Space is normalized as in section 10. Time needs its own pass.

1. Trim the sequence to the detected movement span.
2. Resample to exactly 32 frames by linear interpolation, so a fast sign and a slow sign of the same shape produce the same tensor.
3. Append per-frame velocity, the difference from the previous frame, since direction of travel is what separates several of these signs.

Resampling is what stops signing speed from mattering. Skipping it is the word-sign equivalent of skipping scale normalization for letters, and it fails the same way: quietly, and only for users who do not move at the speed you did while recording.

### What this still is not

A vocabulary of isolated signs is not ASL. Real signing places signs in space and refers back to those places later, inflects verbs by moving them between points, and carries grammar on the face. Recognizing two dozen citation-form signs one at a time is a useful input method and an honest demonstration. It is much further from fluent ASL than the size of the vocabulary makes it sound, and the interface should keep saying so.

---

## 9. Repository layout

Feature-sliced: each slice owns its components, hooks, lib and types, and exports through a barrel.

```
realsign/
  realsign-letters-1440.json      the recorded dataset, 60 frames x 24 letters
  training/
    train_letters.py              trains the model and writes letters.json
  src/
    app/
      page.tsx                    hero, scroll reveal, interpreter
      record/page.tsx             the recorder that produced the dataset
    features/
      hand-tracking/
        lib/landmarks.ts          normalizeHand: the shared normalization
        hooks/use-hand-tracking.ts
      sign-classifier/
        models/letters.json       18k parameters, 214KB, committed
        lib/letter-model.ts       loads the weights, runs the three layers
        lib/spelling.ts           frames -> committed letters -> finished words
        hooks/use-letter-recognizer.ts
      interpreter/                the two-panel screen
      recorder/                   capture UI, alphabet, dataset store
      hand-viewer/, landing/, scroll-experience/
    shared/                       components, config, lib, types
```

The weights are committed rather than downloaded: they are 214KB, they are the output of a script in this repository run against data in this repository, and a build step that trains a model is a build step that can fail.

---

## 10. Landmark normalization

The step most projects get wrong. Raw MediaPipe coordinates are relative to the frame, so the same letter at a different distance produces completely different numbers.

`normalizeHand` in `hand-tracking/lib/landmarks.ts` is the whole of it, and the important property is that there is exactly one copy. It runs at record time and at inference time, so there is no second implementation to drift.

1. Reflect a left hand about the frame's midline, into right-hand space.
2. Translate so the wrist sits at the origin.
3. Scale so the distance from wrist to middle-finger MCP equals one, measured in the image plane only — MediaPipe's z is far noisier than x and y, and letting it into the divisor makes the whole vector jump when depth guessing wobbles.
4. Rotate so that same vector points at -pi/2, which removes hand tilt.
5. Flatten the 21 points into a 63-value vector.

### Five of the 63 values are constant

Steps 2 and 4 pin the wrist to (0, 0, 0) and the middle-MCP to (0, -1, z). Those five numbers are identical in every sample the function has ever produced, so their standard deviation across a training set is exactly zero.

This is worth knowing because it is a trap. A standardizer that divides by the deviation, guarded with the usual small floor, divides those five features by that floor instead — and the first version of the training script did, which turned augmentation noise into values around 200,000 and collapsed the model to chance. The fix is to leave them unscaled. `train_letters.py` prints how many it found on every run rather than hard-coding five, so a change to the normalization surfaces rather than silently re-arming the trap.

### The letters that inflate

G, Q, H and P come out several times larger than the other letters, because they are signed with the hand rotated so that the wrist-to-middle-MCP vector is foreshortened in the image plane — and that vector is the divisor. Q reaches 5.3 where most letters stay under 2. It is not a bug, and it is mild evidence rather than noise, but it is why standardization is not optional here.

### The mismatch that remains

MediaPipe reports x normalized by frame width and y by frame height, so the two are in different units unless the frame is square. Steps 2 to 4 cancel translation, scale and rotation, but not that anisotropy. Recording and inference happening on the same camera hides it; a different aspect ratio would not.

---

## 11. Sentence smoothing

Not built, and the reason has changed.

The original design posted the token list to a serverless function and asked a language model to turn it into an English sentence. That was written when the pipeline was expected to produce word signs in ASL word order, where MY NAME S-A-M genuinely has to become "My name is Sam".

What the pipeline actually produces is fingerspelling. A spelled word is already English — it is the letters, in order — so the only thing a language model could add is correction: turning HELLQ into HELLO. That is a real benefit and it is also the reason not to do it yet. This model is trained on one person in one sitting, and its errors have not been characterised on anyone else. A corrector tuned against unknown error modes will confidently rewrite correct spellings, and the failure would be invisible, because the output would read better.

It also costs the unconditional privacy claim in section 2, which is currently worth more than the correction would be.

When word signs land, this comes back, and it comes back with the ASL word-order problem it was originally designed for.

---

## 12. Accessibility

The audience for this project includes deaf and hard of hearing users, so accessibility failures are worse here than on a typical site.

- Every control reachable and visible by keyboard
- `prefers-reduced-motion` disables the pinned scroll sequence
- Text contrast checked against cream, not against white
- No information carried by colour alone, so the confidence meter also shows a number
- Camera permission denial explained in plain language with a way forward

---

## 13. Open questions

- What the accuracy is for anyone who is not the person who recorded the data. Nothing else on this list is close. It needs a second recording session, by a different person on a different camera, held out entirely from training. Section 14.
- Whether the confusable sets the alphabet flags (M/N/S/T, R/U/V) actually confuse this model on a stranger's hand. On the held-out frames they do not, but those frames are the same hand.
- Whether four agreeing samples is the right threshold, and whether it should adapt to how fast someone is spelling rather than being a constant
- Whether double letters can be detected properly, from the small bounce a signer actually makes, rather than by requiring a dip of the hand
- Whether square-cropping the camera frame before MediaPipe closes the aspect-ratio gap in section 10, or just moves it
- What a NONE class would take, so that a hand between letters reads as nothing rather than as the nearest letter

## 14. What the accuracy figure is worth

The training script reports 99.7% on held-out frames. That number is real, reproducible, and much weaker evidence than it looks.

**Every letter is one continuous hold.** The recorder captures a burst of 60 consecutive frames while the shape is held still, and 60 is exactly the target, so each class is one burst. This is measured rather than assumed: neighbouring samples sit about 3.9 times closer together than random pairs of the same letter, and the training script recomputes that ratio on every run and prints it.

**So a random split leaks.** Test frames would be near-duplicates of training frames taken milliseconds apart. The script trains a second model on a random split purely to show the gap: it scores 100%.

**The reported split is temporal.** The first 60% of each hold trains, the next 20% selects the model, the last 20% is scored once. The test frames at least sit on the far side of whatever drift happened during the hold, which is why the honest number is 99.65% rather than 100%.

**None of that crosses a session.** One person, one hand, one room, one camera, one afternoon. Lighting, skin tone, hand size, camera height, lens distortion and how precisely someone forms a letter are all held constant, and all of them vary in reality.

Treat 99.7% as an upper bound on a stranger's experience, not an estimate of it. The interface says so, and the fix is a second recording session rather than a better model.

---

