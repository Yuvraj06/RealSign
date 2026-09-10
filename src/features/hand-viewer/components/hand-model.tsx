"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Center, Resize, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { MODEL_PATH } from "@/shared/config";
import { lerp } from "@/shared/lib";
import { useScrollProgressRef } from "@/features/scroll-experience/lib/progress";
import type { HandSweep } from "../types";

/**
 * The hand travels diagonally, from low on the right to high off the left
 * edge, growing the whole way. Turning as it goes makes it read as passing
 * by rather than sliding.
 */
export const HAND_SWEEP: HandSweep = {
  from: { positionX: 2.6, positionY: -0.35, rotationY: 0.2, scale: 3.2 },
  to: { positionX: -5.4, positionY: 2.6, rotationY: 4.6, scale: 7.0 },
};

export function HandModel() {
  const group = useRef<Group>(null);
  const progressRef = useScrollProgressRef();
  const { scene } = useGLTF(MODEL_PATH);

  useFrame((state) => {
    const node = group.current;
    if (!node) return;

    const progress = progressRef?.current ?? 0;
    const { from, to } = HAND_SWEEP;
    const time = state.clock.elapsedTime;

    node.position.x = lerp(from.positionX, to.positionX, progress);
    node.position.y =
      lerp(from.positionY, to.positionY, progress) + Math.sin(time * 0.6) * 0.05;

    const scale = lerp(from.scale, to.scale, progress);
    node.scale.setScalar(scale);

    // The idle rotation never stops, so the hand never looks like a static
    // image being translated across the screen.
    node.rotation.y =
      lerp(from.rotationY, to.rotationY, progress) + Math.sin(time * 0.4) * 0.05;
    node.rotation.z = Math.sin(time * 0.3) * 0.03;
  });

  return (
    <group ref={group} dispose={null}>
      {/* Resize normalizes the glb to a unit box, so the sweep keyframes above
          stay correct no matter what scale the model was exported at. */}
      <Center>
        <Resize>
          <primitive object={scene} />
        </Resize>
      </Center>
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
