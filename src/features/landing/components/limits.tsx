import { Panel } from "@/shared/components";
import type { Limit } from "../types";

/**
 * The boundaries, stated in the interface.
 * A tool that is honest about its limits reads as more credible than one
 * that overpromises.
 */
const LIMITS: Limit[] = [
  {
    title: "A word list, not a language",
    body: "realsign reads the manual alphabet and a fixed set of signs, one at a time, in their dictionary form. That is a useful input method and it is much further from fluent ASL than the size of the list suggests.",
  },
  {
    title: "Facial grammar is missing",
    body: "Eyebrows, mouth and head movement carry real meaning in ASL. None of it is captured here.",
  },
  {
    title: "No signing space",
    body: "Real signing places signs in the space around the signer and refers back to those places later. realsign reads each sign on its own and forgets where you put it.",
  },
  {
    title: "One hand, one signer",
    body: "Every sign it knows is one-handed. Two-handed signs and scenes with more than one signer are out of scope.",
  },
  {
    title: "Readings can be wrong",
    body: "M, N, S and T look alike to the model, and signs that start the same way get confused too. When it is unsure it says so instead of guessing confidently.",
  },
  {
    title: "The sentence is a guess",
    body: "Signs carry no tense or articles, so a language model turns them into English. It is filling in words you did not sign, and it can fill in the wrong ones.",
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
