/**
 * Camera abstraction — the demo's stand-in for §9.3's camera adapter interface.
 *
 * Two implementations behind one interface, exactly as the spec structures its DSLR /
 * webcam split: `WebcamSource` drives a real device through getUserMedia, and
 * `SyntheticSource` renders an animated test pattern when there is no camera or the
 * user denies permission. A real build adds a gPhoto2/EDSDK adapter here without
 * touching the capture screen.
 *
 * The fallback is deliberately conspicuous (the UI shows a SYNTHETIC CAMERA badge):
 * a demo that silently substituted fake frames for a broken webcam would misrepresent
 * what works.
 */

export type CameraKind = "webcam" | "synthetic";

export interface CameraStatus {
  kind: CameraKind;
  label: string;
  width: number;
  height: number;
  /** Why the synthetic source is in use, when it is. */
  reason?: string;
}

export interface CameraSource {
  readonly status: CameraStatus;
  /** Attach the live feed to a video element. */
  attach(video: HTMLVideoElement): Promise<void>;
  /** Grab a still at full sensor resolution. */
  capture(): HTMLCanvasElement;
  stop(): void;
}

/** Capture target: 3:2, the aspect the seeded template slots are cut for. */
const CAPTURE_WIDTH = 1080;
const CAPTURE_HEIGHT = 720;

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

class WebcamSource implements CameraSource {
  status: CameraStatus;
  private video: HTMLVideoElement | null = null;

  constructor(private stream: MediaStream, label: string, width: number, height: number) {
    this.status = { kind: "webcam", label, width, height };
  }

  async attach(video: HTMLVideoElement): Promise<void> {
    this.video = video;
    video.srcObject = this.stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
  }

  capture(): HTMLCanvasElement {
    const video = this.video;
    if (!video || video.readyState < 2) {
      throw new Error("Camera is not ready yet");
    }
    // Centre-crop the sensor frame to the capture aspect rather than squashing it:
    // a stretched face is the one artefact people notice immediately.
    const sw = video.videoWidth;
    const sh = video.videoHeight;
    const targetAspect = CAPTURE_WIDTH / CAPTURE_HEIGHT;
    let cropW = sw;
    let cropH = Math.round(sw / targetAspect);
    if (cropH > sh) {
      cropH = sh;
      cropW = Math.round(sh * targetAspect);
    }
    const canvas = canvasOf(CAPTURE_WIDTH, CAPTURE_HEIGHT);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      video,
      Math.round((sw - cropW) / 2),
      Math.round((sh - cropH) / 2),
      cropW,
      cropH,
      0,
      0,
      CAPTURE_WIDTH,
      CAPTURE_HEIGHT,
    );
    return canvas;
  }

  stop(): void {
    for (const track of this.stream.getTracks()) track.stop();
    if (this.video) this.video.srcObject = null;
  }
}

/**
 * Animated test pattern for when no camera is available.
 *
 * Drawn rather than a static image so the preview visibly moves — a frozen frame is
 * indistinguishable from a hung feed, which would be confusing in exactly the situation
 * where something is already wrong.
 */
class SyntheticSource implements CameraSource {
  status: CameraStatus;
  private raf = 0;
  private canvas = canvasOf(CAPTURE_WIDTH, CAPTURE_HEIGHT);
  private started = performance.now();

  constructor(reason: string) {
    this.status = {
      kind: "synthetic",
      label: "Synthetic camera",
      width: CAPTURE_WIDTH,
      height: CAPTURE_HEIGHT,
      reason,
    };
  }

  async attach(video: HTMLVideoElement): Promise<void> {
    const draw = () => {
      this.render();
      this.raf = requestAnimationFrame(draw);
    };
    draw();
    // captureStream turns the animated canvas into a MediaStream, so the video element
    // and the capture path stay identical to the webcam case.
    const stream = (this.canvas as HTMLCanvasElement & {
      captureStream(fps?: number): MediaStream;
    }).captureStream(30);
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
  }

  private render(): void {
    const ctx = this.canvas.getContext("2d")!;
    const { width: w, height: h } = this.canvas;
    const t = (performance.now() - this.started) / 1000;

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, `hsl(${(t * 12) % 360} 62% 24%)`);
    bg.addColorStop(1, `hsl(${(t * 12 + 70) % 360} 55% 42%)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Drifting rings, so motion is obvious at a glance.
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const r = ((t * 60 + i * 90) % 520) + 20;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // A framing box, so the operator can see the capture crop.
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.setLineDash([12, 10]);
    ctx.strokeRect(w * 0.12, h * 0.1, w * 0.76, h * 0.8);
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "600 46px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SYNTHETIC CAMERA", w / 2, h / 2 - 8);
    ctx.font = "400 26px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("no webcam available", w / 2, h / 2 + 34);
    // A moving clock proves frames are live, not cached.
    ctx.font = "500 22px ui-monospace, monospace";
    ctx.fillText(t.toFixed(1) + "s", w / 2, h - 40);
  }

  capture(): HTMLCanvasElement {
    const out = canvasOf(CAPTURE_WIDTH, CAPTURE_HEIGHT);
    out.getContext("2d")!.drawImage(this.canvas, 0, 0);
    return out;
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }
}

/**
 * Open the best available camera.
 *
 * Never rejects: a booth that cannot show a preview is useless, so a failure to reach
 * the webcam downgrades to the synthetic source and reports why.
 */
export async function openCamera(): Promise<CameraSource> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return new SyntheticSource("This browser exposes no camera API");
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: "user",
      },
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    const settings = track?.getSettings?.() ?? {};
    return new WebcamSource(
      stream,
      track?.label || "Webcam",
      settings.width ?? CAPTURE_WIDTH,
      settings.height ?? CAPTURE_HEIGHT,
    );
  } catch (error) {
    const reason =
      error instanceof DOMException && error.name === "NotAllowedError"
        ? "Camera permission denied"
        : error instanceof DOMException && error.name === "NotFoundError"
          ? "No camera device found"
          : `Camera unavailable: ${String(error)}`;
    return new SyntheticSource(reason);
  }
}

/** Encode a canvas as a JPEG blob for upload. */
export function toJpeg(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas encoding failed"))),
      "image/jpeg",
      quality,
    );
  });
}
