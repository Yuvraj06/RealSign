/**
 * The letter classifier: 63 normalized landmark values in, one letter out.
 *
 * The model is a three-layer dense network of about 18k parameters, trained by
 * `training/train_letters.py` on samples this app recorded itself. It is small
 * enough that running it here is three matrix multiplies, so there is no
 * inference runtime — a wasm build to execute this would be two orders of
 * magnitude larger than the thing it executes. `train_letters.py --check`
 * verifies these exact weights against PyTorch, which is the guarantee a
 * library would otherwise be providing.
 *
 * Nothing in this file does geometry. Samples were normalized by `normalizeHand`
 * at record time and every frame is normalized by the same function before it
 * arrives here, which is what keeps training and inference in the same space.
 */

import type { LetterModel, LetterModelFile, LetterReading } from "../types";

/**
 * One model for the life of the page.
 *
 * Cached as the promise rather than the result so that two callers asking at
 * once share a single parse. The import is dynamic so the 214KB of weights are
 * a lazy chunk rather than part of the landing page.
 */
let pending: Promise<LetterModel> | null = null;

export function loadLetterModel() {
  // A failed load drops out of the cache, so that starting the camera again
  // genuinely retries instead of handing back the same rejection for the life
  // of the page.
  pending ??= create().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

async function create(): Promise<LetterModel> {
  const file = (await import("../models/letters.json")) as unknown as {
    default: LetterModelFile;
  };
  const model = file.default;

  if (model.kind !== "letters" || model.version !== 1) {
    throw new Error("Unrecognised letter model file.");
  }

  return {
    letters: model.letters,
    featureLength: model.featureLength,
    heldOutAccuracy: model.heldOutAccuracy,
    mean: Float32Array.from(model.mean),
    std: Float32Array.from(model.std),
    layers: model.layers.map((layer) => ({
      inputs: layer.in,
      outputs: layer.out,
      weight: Float32Array.from(layer.weight),
      bias: Float32Array.from(layer.bias),
    })),
  };
}

/**
 * Runs one frame and returns the most likely letter.
 *
 * `values` must be the 63 numbers `normalizeHand` produced for this frame, in
 * its order. Returns null if the frame is the wrong width, which means the
 * caller and the model disagree about the feature layout and every reading
 * after this one would be meaningless.
 */
export function classifyLetter(
  model: LetterModel,
  values: number[],
): LetterReading | null {
  if (values.length !== model.featureLength) return null;

  // Standardized with the training set's own mean and deviation. Five of the
  // 63 values are constant by construction — the wrist sits at the origin and
  // the middle-MCP is pinned by the normalizer — and training wrote 1 into
  // their deviation so they pass through instead of dividing by nothing.
  let activations = new Float32Array(model.featureLength);
  for (let i = 0; i < model.featureLength; i += 1) {
    activations[i] = (values[i] - model.mean[i]) / model.std[i];
  }

  for (let index = 0; index < model.layers.length; index += 1) {
    const layer = model.layers[index];
    const output = new Float32Array(layer.outputs);
    output.set(layer.bias);

    // Input-major, matching how the weights were flattened, so the inner loop
    // walks memory forwards instead of striding by `outputs`.
    for (let i = 0; i < layer.inputs; i += 1) {
      const value = activations[i];
      if (value === 0) continue;

      const row = i * layer.outputs;
      for (let o = 0; o < layer.outputs; o += 1) {
        output[o] += value * layer.weight[row + o];
      }
    }

    // ReLU everywhere but the logits.
    if (index < model.layers.length - 1) {
      for (let o = 0; o < layer.outputs; o += 1) {
        if (output[o] < 0) output[o] = 0;
      }
    }

    activations = output;
  }

  return softmaxTop(model.letters, activations);
}

/** The best letter and its probability, in one pass over the logits. */
function softmaxTop(letters: string[], logits: Float32Array): LetterReading {
  let largest = -Infinity;
  let best = 0;
  for (let i = 0; i < logits.length; i += 1) {
    if (logits[i] > largest) {
      largest = logits[i];
      best = i;
    }
  }

  // Shifted by the maximum before exponentiating, which changes nothing about
  // the result and keeps exp() away from overflow.
  let total = 0;
  for (let i = 0; i < logits.length; i += 1) {
    total += Math.exp(logits[i] - largest);
  }

  return { letter: letters[best], confidence: 1 / total };
}
