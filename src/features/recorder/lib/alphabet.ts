/** The ASL manual alphabet, as the recorder needs to think about it. */
export interface LetterTarget {
  letter: string;
  /**
   * True for the two letters that are traced rather than held.
   *
   * J draws a hook in the air with the pinky, from the I handshape. Z draws
   * the letter with an extended index finger. Neither has a pose of its own to
   * record, which is why `RECORDABLE` leaves them out.
   */
  motion?: true;
  /** Letters that models genuinely confuse, and that need the most samples. */
  confusedWith?: string;
}

export const ALPHABET: LetterTarget[] = [
  { letter: "A", confusedWith: "S, T" },
  { letter: "B" },
  { letter: "C" },
  { letter: "D" },
  { letter: "E", confusedWith: "S" },
  { letter: "F" },
  { letter: "G" },
  { letter: "H" },
  { letter: "I" },
  { letter: "J", motion: true },
  { letter: "K" },
  { letter: "L" },
  { letter: "M", confusedWith: "N, S, T" },
  { letter: "N", confusedWith: "M, S, T" },
  { letter: "O" },
  { letter: "P" },
  { letter: "Q" },
  { letter: "R", confusedWith: "U" },
  { letter: "S", confusedWith: "M, N, T" },
  { letter: "T", confusedWith: "M, N, S" },
  { letter: "U", confusedWith: "R, V" },
  { letter: "V", confusedWith: "U" },
  { letter: "W" },
  { letter: "X" },
  { letter: "Y" },
  { letter: "Z", motion: true },
];

export const LETTERS = ALPHABET.map((target) => target.letter);

/**
 * The 24 letters a single-frame model can actually learn.
 *
 * J and Z are left out of the run rather than merely flagged, because
 * recording them here is worse than not recording them. Both are movements
 * whose handshapes are already taken: J is made in the I handshape, and Z in
 * a pointing index. Normalization then removes the tilt that is the only
 * other thing separating them, so a held J lands on top of I, and a held Z on
 * top of D. Samples like that do not just fail to teach J, they corrupt the
 * letters they collide with.
 *
 * They are still reachable from the grid for anyone who wants them, and they
 * belong to the sequence model in phase 6, alongside the word signs.
 */
export const RECORDABLE = ALPHABET.filter((target) => !target.motion).map(
  (target) => target.letter,
);

/** The floor from section 7. Below this a letter is not worth training on. */
export const SAMPLES_MIN = 40;

/** The point past which more samples of the same letter stop paying for time. */
export const SAMPLES_TARGET = 60;

/** Frames a single burst collects before stopping itself. */
export const BURST_SIZE = SAMPLES_TARGET;

/**
 * Moves along the recordable run, skipping the movement letters.
 *
 * From a movement letter it rejoins the run at the nearest neighbour in the
 * direction of travel, so arriving at J from the grid and pressing next does
 * the obvious thing.
 */
export function stepLetter(from: string, direction: number): string {
  const index = RECORDABLE.indexOf(from);

  if (index !== -1) {
    const next = (index + direction + RECORDABLE.length) % RECORDABLE.length;
    return RECORDABLE[next];
  }

  const position = LETTERS.indexOf(from);
  const forward = RECORDABLE.find((letter) => LETTERS.indexOf(letter) > position);
  const backward = [...RECORDABLE]
    .reverse()
    .find((letter) => LETTERS.indexOf(letter) < position);

  return direction > 0
    ? (forward ?? RECORDABLE[0])
    : (backward ?? RECORDABLE[RECORDABLE.length - 1]);
}
