import { ALPHABET } from "@/features/recorder/lib";
import { Panel } from "@/shared/components";

/**
 * The whole alphabet, on the page, with the two gaps marked.
 *
 * A fixed list is a boundary as much as a feature, so showing all of it is
 * more honest than naming a count and letting people guess what is in it. The
 * source is the recorder's own alphabet rather than a second copy: the model
 * was trained on exactly the letters that were recordable, so the two cannot
 * drift apart without the training run noticing.
 */
export function Vocabulary() {
  const readable = ALPHABET.filter((target) => !target.motion);

  return (
    <section className="bg-cream py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <h2 className="font-display text-heading font-semibold text-forest">
          What it can read
        </h2>
        <p className="measure mt-3 font-body text-lead text-forest/75">
          These {readable.length} letters of the manual alphabet, held one at a
          time. Not J or Z, and no word signs.
        </p>

        <Panel className="mt-10 p-6 sm:p-8">
          <ul className="flex flex-wrap gap-2">
            {ALPHABET.map((target) => (
              <li
                key={target.letter}
                className={
                  target.motion
                    ? "rounded-chip bg-clay/12 px-4 py-2 font-display text-title font-semibold text-clay/70 line-through decoration-clay/50"
                    : "rounded-chip bg-sage px-4 py-2 font-display text-title font-semibold text-forest"
                }
              >
                {target.letter}
              </li>
            ))}
          </ul>
        </Panel>

        <p className="measure mt-6 font-body text-caption text-forest/75">
          J and Z are struck through because they are movements, not shapes. J
          is drawn in the I handshape and Z with a pointing index, so a single
          frame of either is already another letter — and the normalization
          removes the tilt that would otherwise separate them. They need a model
          that reads time, which this is not.
        </p>
      </div>
    </section>
  );
}
