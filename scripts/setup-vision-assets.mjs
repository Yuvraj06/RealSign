// Puts the MediaPipe runtime under public/ so the browser fetches it from this
// origin instead of a CDN. The privacy claim in the interface is that video
// never leaves the device; serving the tracker ourselves keeps the network tab
// honest about that, and it means the interpreter works offline once cached.
//
// Both steps are skipped when the files are already in place, so this is cheap
// to run before every dev server and build.

import { createWriteStream } from "node:fs";
import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * FilesetResolver picks the SIMD build when the browser supports it and falls
 * back to the nosimd one, so both have to be present. The `_module_` variants
 * are only used with ES module loading, which we do not ask for.
 */
const WASM_FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

const WASM_SOURCE = join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const WASM_TARGET = join(root, "public/mediapipe/wasm");

/** Float16 build: half the download of float32 and no measurable accuracy cost. */
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const MODEL_TARGET = join(root, "public/models/hand_landmarker.task");

async function exists(path) {
  try {
    const info = await stat(path);
    return info.size > 0;
  } catch {
    return false;
  }
}

async function copyWasm() {
  if (!(await exists(join(WASM_SOURCE, WASM_FILES[0])))) {
    throw new Error(
      "@mediapipe/tasks-vision is not installed. Run `npm install` first.",
    );
  }

  await mkdir(WASM_TARGET, { recursive: true });

  let copied = 0;
  for (const file of WASM_FILES) {
    const target = join(WASM_TARGET, file);
    if (await exists(target)) continue;
    await copyFile(join(WASM_SOURCE, file), target);
    copied += 1;
  }

  console.log(
    copied === 0
      ? "vision wasm: already in public/mediapipe/wasm"
      : `vision wasm: copied ${copied} file(s) to public/mediapipe/wasm`,
  );
}

async function downloadModel() {
  if (await exists(MODEL_TARGET)) {
    console.log("hand landmarker: already in public/models");
    return;
  }

  console.log("hand landmarker: downloading (~7MB)...");
  const response = await fetch(MODEL_URL);
  if (!response.ok || !response.body) {
    throw new Error(
      `Could not download the hand landmarker model (${response.status}). ` +
        `Download it manually from ${MODEL_URL} and save it to public/models/.`,
    );
  }

  await mkdir(dirname(MODEL_TARGET), { recursive: true });
  // Streamed to disk so a partial write is never mistaken for a whole model.
  const temporary = `${MODEL_TARGET}.download`;
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
  await copyFile(temporary, MODEL_TARGET);
  await import("node:fs/promises").then((fs) => fs.rm(temporary));

  console.log("hand landmarker: saved to public/models");
}

await copyWasm();
await downloadModel();
