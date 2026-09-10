# realsign

A browser-based American Sign Language interpreter. A webcam reads fingerspelling and a small set of common word signs, a pair of small models names what it sees, and a language model turns the result into a readable sentence. Video never leaves the device.

---

## 1. Scope

**In scope for v1**

- ASL manual alphabet, 26 one-handed letters
- A starter vocabulary of common one-handed word signs, described in section 8
- Single hand, single signer, front-facing camera
- Recognition running entirely in the browser with TensorFlow.js
- Sentence smoothing through one serverless function

**Explicitly out of scope**

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
  -> MediaPipe Tasks (Web)        landmarks, 21 points, ~30fps, client
  -> normalization                translation, scale and rotation invariant
  -> rolling buffer               30 to 45 frames
  -> segmentation                 held pose, or movement burst
       held pose   -> TF.js letter classifier   letter + confidence, client
       movement    -> TF.js sign classifier     word + confidence, client
  -> token buffer                 letters and words accumulate
  -> /api/smooth                  serverless, calls the LLM
  -> sentence + transcript
```

Segmentation sits before the models rather than after them, because it is what decides which model to ask. A held shape is a letter. A movement is a word sign. Section 8 covers that split in detail.

Everything runs client-side except the final smoothing call. That one exception exists because an API key cannot be shipped in browser code. The serverless function receives only a short list of recognized letters and signs, never video or landmarks.

### Why landmarks instead of raw pixels

Landmark input keeps the model at a few hundred kilobytes instead of tens of megabytes, trains on a laptop in minutes, runs comfortably at thirty frames per second on mid-range hardware, and generalizes across skin tone, lighting and background far better than a pixel-based classifier. This is the single most important architectural decision in the project.

---

## 3. Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router) | Serverless route for smoothing lives in the same repo |
| Styling | Tailwind CSS | Fast iteration on a small token set |
| 3D | Three.js via React Three Fiber and Drei | Hand model, scroll-driven camera work |
| Scroll | GSAP ScrollTrigger with Lenis | Reliable pinning and scrubbing |
| Tracking | @mediapipe/tasks-vision | Current supported MediaPipe web build |
| Model runtime | @tensorflow/tfjs | WebGL backend |
| Training | Python, TensorFlow or PyTorch | Converted to TF.js layers format |

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

White background, arranged as two panels.

**Left, camera.** Video feed mirrored horizontally, landmark skeleton drawn over it in green, rounded corners, a small status pill in the corner reading idle, reading or paused.

**Right, reading.** Chips appearing left to right, a confidence meter, the smoothed sentence set large in the display face, and a running transcript beneath.

**Two kinds of chip.** A letter chip holds one character. A word chip holds a whole sign, set in the same face at the same size, so a sentence built from both reads as one line rather than two systems bolted together. Word chips carry a small `sign` label, because a user needs to know whether the model read a gesture or spelled something out when they go to correct it.

**Controls.** Start camera, clear, copy transcript. Verbs stay consistent throughout, so the button that says "start camera" produces a status that says "reading".

**Empty states.** Say what to do rather than what is missing. "Show your hand to the camera and hold a letter" beats "no data".

**Confidence rule.** Below 72 percent, the chip switches to clay and the meter follows. M, N, S and T are visually similar in ASL and models genuinely confuse them, so surfacing doubt is more useful than a confident wrong answer. The same rule applies to word signs, where the confusable pairs are different but the problem is identical.

---

## 7. Build order

**Phase 1, UI shell.** Full page with a mock recognizer emitting scripted letters on a timer. Finish the hero, the scroll reveal and every state of the interpreter panel before any model exists. This is where most of the visual work happens and it is not blocked by anything.

**Phase 2, tracking.** Wire MediaPipe, draw the skeleton over the video, confirm a stable frame rate. Success here means clean landmarks, not predictions.

**Phase 3, data.** Build a recorder route at `/record` that shows a target letter, captures normalized landmark frames while you hold the pose, and exports JSON. Aim for 40 to 60 samples per letter, varying hand distance, angle and lighting. Recording your own data through the same pipeline that will run at inference removes an entire class of distribution mismatch.

**Phase 4, model.** Train a small dense network or a GRU on the recorded sequences, convert to TF.js, load in the browser. Keep a held-out set and record the confusion matrix, because it tells you which letters need more samples.

**Phase 5, segmentation and smoothing.** Detect pauses to close each letter, accumulate a token buffer, and post it to the smoothing route.

**Phase 6, word signs.** Extend the recorder to capture sequences instead of single poses, record the starter vocabulary plus the NONE class, train the sequence model, and route movement bursts to it. Section 8 covers this phase in full. It comes last of the recognition phases because it depends on segmentation already working, and because a fingerspelling-only build is a complete, useful thing to ship on its own.

**Phase 7, polish.** Permission denial handling, low light warning, mobile fallback, keyboard focus states, reduced motion.

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

```
realsign/
  app/
    page.tsx                 hero, scroll reveal, interpreter
    api/smooth/route.ts      serverless LLM call
    record/page.tsx          letter recorder, single poses
    record/signs/page.tsx    sign recorder, sequences
  components/
    HandModel.tsx            R3F scene, scroll-driven
    Hero.tsx
    Interpreter.tsx
    CameraPanel.tsx
    ReadingPanel.tsx
  lib/
    landmarks.ts             spatial normalization helpers
    sequences.ts             trim, resample to 32 frames, velocity
    classifier.ts            TF.js load and predict, letters
    signs.ts                 TF.js load and predict, word signs
    vocabulary.ts            the sign list and its labels
    segmenter.ts             held pose against movement burst, token buffer
  public/
    models/hand.glb
    model/letters/           converted TF.js letter model
    model/signs/             converted TF.js sign model
  training/
    train_letters.py
    train_signs.py
    convert.sh
    data/
```

---

## 10. Landmark normalization

The step most projects get wrong. Raw MediaPipe coordinates are relative to the frame, so the same letter at a different distance produces completely different numbers.

1. Translate so the wrist landmark sits at the origin.
2. Scale so the distance from wrist to middle finger MCP equals one.
3. Optionally rotate so that same vector points in a fixed direction, which removes hand tilt.
4. Flatten the 21 points into a 63-value vector.

Apply the identical function during recording and during inference. Any difference between the two silently destroys accuracy, and it is very hard to debug after the fact.

One caveat for word signs. Steps 1 and 3 throw away where the hand is in the frame and which way it is tilted, which is exactly right for letters and wrong for signs that mean different things at different heights. Keep the wrist position and the rotation angle as extra channels on the sequence tensor rather than discarding them, so the sign model can use what the letter model needs removed.

---

## 11. Sentence smoothing

```ts
// app/api/smooth/route.ts
export async function POST(req: Request) {
  const { tokens } = await req.json();
  // tokens: [{ kind: "letter", value: "H" }, { kind: "sign", value: "NAME" }]
  // call the model with a prompt that returns plain text only,
  // no preamble, no markdown, one sentence
}
```

Prompt shape: give the model the token list, say that letters came from ASL fingerspelling and signs from a small fixed vocabulary, note that both may contain recognition errors, and ask for the most plausible short sentence as plain text. Correcting likely misreads, for example M against N, is a real benefit of this step rather than a side effect.

Word signs make this step do more work, not less. ASL word order is not English word order, and citation-form signs carry no tense or articles, so a run of tokens like ME NAME S-A-M has to become "My name is Sam". Tell the model that in the prompt, and mark the sign tokens as glosses rather than as English words, otherwise it will treat them as already-correct output and leave them alone.

Cache repeated inputs, debounce so a call fires only once per completed token, and always fall back to displaying the raw tokens if the request fails.

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

- Whether to add two-handed signs, which widens the input to a real 126 values and needs a rule for which hand anchors the normalization when both are moving
- How far the sign vocabulary can grow before a flat classifier stops working and the problem turns into continuous recognition
- Whether users should be able to correct a wrong sign in the transcript, and whether those corrections should feed back into training data
- Whether the transcript should persist across sessions
- Whether to offer a text-to-sign reverse direction, which needs either video clips or an animated avatar
