import {
  SIGN_COUNT,
  SIGN_VOCABULARY,
  signLabel,
} from "@/features/sign-classifier/lib";
import { Panel } from "@/shared/components";

/**
 * The whole vocabulary, on the page.
 *
 * A fixed sign list is a boundary as much as a feature, so showing all of it
 * is more honest than naming a count and letting people guess what is in it.
 */
export function Vocabulary() {
  return (
    <section className="bg-cream py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <h2 className="font-display text-heading font-semibold text-forest">
          What it can read
        </h2>
        <p className="measure mt-3 font-body text-lead text-forest/75">
          The 26 letters of the manual alphabet, plus these {SIGN_COUNT} signs.
          Anything else has to be spelled out.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SIGN_VOCABULARY.map((group) => (
            <Panel key={group.label} className="p-6">
              <h3 className="font-display text-lead font-semibold text-forest">
                {group.label}
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {group.signs.map((sign) => (
                  <li
                    key={sign}
                    className="rounded-chip bg-sage px-3 py-1.5 font-body text-body text-forest"
                  >
                    {signLabel(sign)}
                  </li>
                ))}
              </ul>
            </Panel>
          ))}

          <Panel className="p-6">
            <h3 className="font-display text-lead font-semibold text-forest">
              Everything else
            </h3>
            <p className="measure mt-3 font-body text-body text-forest/75">
              Spell it letter by letter. The reading step stitches spelled words
              and signs into one sentence.
            </p>
          </Panel>
        </div>
      </div>
    </section>
  );
}
