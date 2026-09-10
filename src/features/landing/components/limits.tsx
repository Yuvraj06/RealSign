import { Panel } from "@/shared/components";
import type { Limit } from "../types";

/**
 * The boundaries, stated in the interface.
 * A tool that is honest about its limits reads as more credible than one
 * that overpromises.
 */
const LIMITS: Limit[] = [
  {
    title: "One person taught it, in one sitting",
    body: "The model learned from 1,440 samples recorded through this app: 60 frames of each letter, one hand, one room, one camera. It reads 99.7% of the frames held out of that sitting, and that number says almost nothing about how it will read yours.",
  },
  {
    title: "A word list, not a language",
    body: "It reads 24 handshapes of the manual alphabet, one at a time. Fingerspelling is how ASL handles names and words it has no sign for — it is not how ASL is spoken, and it is a fraction of the language.",
  },
  {
    title: "No J, no Z, no word signs",
    body: "J and Z are traced in the air rather than held, so a single frame of either is already a different letter. Word signs are movements too. Both need a model that reads a sequence, and that does not exist here yet.",
  },
  {
    title: "Letters that look alike get confused",
    body: "M, N, S and T are the same fist with the thumb in four places, and R, U and V differ by how two fingers cross. When the model is unsure it says so with a number instead of guessing confidently.",
  },
  {
    title: "Nothing corrects the spelling",
    body: "The reading is exactly the letters that landed, in order. There is no language model tidying HELLQ into HELLO, which means a misread stays visible rather than being smoothed into something that was never signed.",
  },
  {
    title: "Facial grammar and signing space are missing",
    body: "Eyebrows, mouth and head movement carry real meaning in ASL, and real signing places signs in the space around the signer. None of that is captured by 21 landmarks on one hand.",
  },
];

export function Limits() {
  return (
    <section className="bg-cream py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <h2 className="font-display text-heading font-semibold text-forest">
          What this does not do
        </h2>
        <p className="measure mt-3 font-body text-lead text-forest/75">
          Worth reading before you rely on it for anything.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {LIMITS.map((limit) => (
            <Panel key={limit.title} className="p-6">
              <h3 className="font-display text-lead font-semibold text-forest">
                {limit.title}
              </h3>
              <p className="measure mt-2 font-body text-body text-forest/75">
                {limit.body}
              </p>
            </Panel>
          ))}
        </div>
      </div>
    </section>
  );
}
