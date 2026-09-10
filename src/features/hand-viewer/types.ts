// Types for the 3D hand viewer slice (R3F + Drei rendering of public/models/hand.glb)

/** Where the hand sits at each end of the pinned scroll timeline. */
export interface HandKeyframe {
  positionX: number;
  positionY: number;
  rotationY: number;
  /** Uniform scale. The hand grows as it sweeps, so it reads as coming closer. */
  scale: number;
}

export interface HandSweep {
  from: HandKeyframe;
  to: HandKeyframe;
}
