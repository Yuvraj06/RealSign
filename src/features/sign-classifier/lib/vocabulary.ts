/**
 * The starter vocabulary: 24 one-handed signs, grouped by use.
 *
 * Two-handed signs are deliberately absent. They change the input width and
 * the normalization anchor, so they are a separate step rather than a bigger
 * version of this one.
 */
export interface SignGroup {
  label: string;
  /** Glosses, in the conventional uppercase notation. */
  signs: string[];
}

export const SIGN_VOCABULARY: SignGroup[] = [
  {
    label: "Greeting",
    signs: ["HELLO", "GOODBYE", "THANK-YOU", "PLEASE", "SORRY"],
  },
  { label: "Response", signs: ["YES", "NO", "GOOD", "BAD", "FINE"] },
  { label: "Person", signs: ["ME", "YOU", "MY", "YOUR", "NAME"] },
  { label: "Question", signs: ["WHAT", "WHERE", "WHO", "HOW"] },
  { label: "Everyday", signs: ["EAT", "DRINK", "WATER", "HOME", "UNDERSTAND"] },
];

export const SIGN_COUNT = SIGN_VOCABULARY.reduce(
  (total, group) => total + group.signs.length,
  0,
);

/**
 * Glosses are written uppercase by convention, but the design system rules
 * out all-caps labels, so they are lowercased for display.
 */
export function signLabel(gloss: string) {
  return gloss.toLowerCase().replace(/-/g, " ");
}
