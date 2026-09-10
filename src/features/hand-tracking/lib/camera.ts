import type { TrackingFault } from "../types";

/** A camera failure that the interface knows how to explain. */
export class TrackingError extends Error {
  constructor(readonly fault: TrackingFault) {
    super(fault);
    this.name = "TrackingError";
  }
}

/**
 * 4:3 at a modest resolution. Landmark accuracy stops improving well before
 * 720p, and a smaller frame is a cheaper frame, which matters more here.
 */
const CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30 },
  },
  audio: false,
};

/** Asks for the webcam, translating browser errors into faults we have copy for. */
export async function openCamera(): Promise<MediaStream> {
  // getUserMedia is undefined rather than throwing on http:// origins, so the
  // insecure case has to be checked before the call.
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new TrackingError("insecure");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new TrackingError("unavailable");
  }

  try {
    return await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
  } catch (error) {
    throw new TrackingError(faultFor(error));
  }
}

function faultFor(error: unknown): TrackingFault {
  if (!(error instanceof DOMException)) return "unavailable";

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "denied";
    // NotFoundError: no camera. NotReadableError: another app has it.
    // OverconstrainedError: nothing matches, which for these loose
    // constraints means there is effectively no usable camera.
    default:
      return "unavailable";
  }
}

/** Stops every track and detaches the stream from the element. */
export function closeCamera(video: HTMLVideoElement | null) {
  const stream = video?.srcObject;
  if (stream instanceof MediaStream) {
    for (const track of stream.getTracks()) track.stop();
  }
  if (video) video.srcObject = null;
}

/** Resolves once the element has frames to read. */
export function waitForFrames(video: HTMLVideoElement) {
  // HAVE_CURRENT_DATA. Calling detectForVideo before this throws.
  if (video.readyState >= 2) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const done = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("error", fail);
      reject(new TrackingError("unavailable"));
    };

    video.addEventListener("loadeddata", done);
    video.addEventListener("error", fail);
  });
}
