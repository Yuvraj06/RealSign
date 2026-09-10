"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { HandModel } from "./hand-model";

/**
 * The hand layer of the hero. Purely decorative, so it is hidden from
 * assistive technology and never takes pointer events.
 */
export function HandScene() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.5;
        }}
      >
        {/* Bright and warm. The fills keep the shadow side from going muddy,
            so the model sits inside the cream rather than floating on it. */}
        <ambientLight intensity={1.2} color="#fff6e2" />
        <hemisphereLight args={["#fffaf0", "#e6d4ad", 2.2]} />
        <directionalLight position={[3, 4, 5]} intensity={3.2} color="#fff8e8" />
        <directionalLight
          position={[-4, 1, 3]}
          intensity={1.6}
          color="#ffeccc"
        />
        <directionalLight
          position={[0, -3, -4]}
          intensity={0.9}
          color="#eaf1e8"
        />
        <Suspense fallback={null}>
          <HandModel />
        </Suspense>
      </Canvas>
    </div>
  );
}
