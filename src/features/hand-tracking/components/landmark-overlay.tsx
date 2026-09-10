"use client";

import { useEffect, useRef, type RefObject } from "react";
import { lerp } from "@/shared/lib";
import { HAND_CONNECTIONS, PLACEHOLDER_HAND } from "../lib/hand-connections";
import type { HandLandmarks } from "../types";

const GREEN = "#3F7A55";

/**
 * How much of the new position to take each frame. MediaPipe output jitters by
 * a pixel or two even on a still hand, and the eye reads that as the tracker
 * being unsure when it is not. Low enough to settle, high enough that the
 * skeleton never lags a real movement visibly.
 */
const SMOOTHING = 0.55;

interface LandmarkOverlayProps {
  /** The feed being tracked. Its intrinsic size decides where landmarks land. */
  videoRef?: RefObject<HTMLVideoElement | null>;
  /** Live landmarks, read every frame rather than passed as state. */
  landmarksRef?: RefObject<HandLandmarks | null>;
  /** Full-strength skeleton while tracking, faint while not. */
  active: boolean;
  /** Draw an illustrative hand when there is no camera to read from. */
  placeholder?: boolean;
}

/**
 * Draws the 21-point skeleton over the camera area.
 *
 * Runs its own animation frame and reads landmarks from a ref, so a 30fps feed
 * never re-renders React. With no feed it can show a placeholder hand, which
 * is what fills the panel before the camera is started.
 */
export function LandmarkOverlay({
  videoRef,
  landmarksRef,
  active,
  placeholder = false,
}: LandmarkOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    /** Positions actually drawn, easing toward the detected ones. */
    let smoothed: HandLandmarks | null = null;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      frame = requestAnimationFrame(draw);

      const { width, height } = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);

      const detected = landmarksRef?.current ?? null;

      if (detected) {
        const previous = smoothed;
        smoothed = previous
          ? detected.map((point, index) => ({
              x: lerp(previous[index].x, point.x, SMOOTHING),
              y: lerp(previous[index].y, point.y, SMOOTHING),
            }))
          : detected;
      } else {
        // Start clean next time rather than easing in from a stale pose.
        smoothed = null;
      }

      const hand = smoothed ?? (placeholder ? PLACEHOLDER_HAND : null);
      if (!hand) return;

      const video = videoRef?.current;
      const project = smoothed
        ? videoFit(video, width, height)
        : centeredFit(width, height);
      const points = hand.map(project);
      const size = Math.min(width, height);

      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = GREEN;
      context.fillStyle = GREEN;
      context.globalAlpha = active ? 0.9 : 0.35;
      context.lineWidth = Math.max(2, size * 0.012);

      for (const [from, to] of HAND_CONNECTIONS) {
        context.beginPath();
        context.moveTo(points[from].x, points[from].y);
        context.lineTo(points[to].x, points[to].y);
        context.stroke();
      }

      const radius = Math.max(2.5, size * 0.011);
      for (const point of points) {
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [active, placeholder, landmarksRef, videoRef]);

  return (
    <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />
  );
}

/**
 * Landmarks are normalized to the video frame, but the video is drawn with
 * `object-cover`, which crops it. Repeating that crop here is what keeps the
 * skeleton on the hand when the camera's aspect ratio is not the panel's.
 */
function videoFit(
  video: HTMLVideoElement | null | undefined,
  width: number,
  height: number,
) {
  const frameWidth = video?.videoWidth ?? 0;
  const frameHeight = video?.videoHeight ?? 0;

  if (!frameWidth || !frameHeight) {
    return (point: { x: number; y: number }) => ({
      x: point.x * width,
      y: point.y * height,
    });
  }

  const scale = Math.max(width / frameWidth, height / frameHeight);
  const drawnWidth = frameWidth * scale;
  const drawnHeight = frameHeight * scale;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;

  return (point: { x: number; y: number }) => ({
    x: offsetX + point.x * drawnWidth,
    y: offsetY + point.y * drawnHeight,
  });
}

/** Fits the placeholder hand into the panel with a little breathing room. */
function centeredFit(width: number, height: number) {
  const size = Math.min(width, height) * 0.82;
  const offsetX = (width - size) / 2;
  const offsetY = (height - size) / 2;

  return (point: { x: number; y: number }) => ({
    x: offsetX + point.x * size,
    y: offsetY + point.y * size,
  });
}
