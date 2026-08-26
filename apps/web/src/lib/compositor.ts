/**
 * Template compositor — §12.3, rendered in the browser.
 *
 * Consumes the §12.2 JSON stored in `templates.configuration` verbatim: canvas geometry,
 * a slots array, and text decorations. The booth owns the template engine (§8.1), which
 * is why this runs client-side rather than in server-side Pillow — and it keeps the
 * final preview instant, with no upload round-trip before the customer sees their strip.
 *
 * Slot coordinates are in canvas pixels at the template's DPI (the seeded strip is
 * 1200x1800 at 300dpi = 4x6in), so the output is print-correct without rescaling.
 */

export interface SlotBorder {
  width?: number;
  color?: string;
  radius?: number;
}

export interface TemplateSlot {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  border?: SlotBorder;
  crop_mode?: "cover" | "contain";
}

export interface TemplateDecoration {
  type: string;
  content?: string;
  x: number;
  y: number;
  font_size?: number;
  font_family?: string;
  color?: string;
  alignment?: CanvasTextAlign;
  letter_spacing?: number;
}

export interface TemplateCanvas {
  width: number;
  height: number;
  background_color?: string;
  accent_color?: string;
  dpi?: number;
}

export interface TemplateConfig {
  template_id?: string;
  name: string;
  canvas: TemplateCanvas;
  slots: TemplateSlot[];
  decorations?: TemplateDecoration[];
  metadata?: Record<string, unknown>;
}

/** A capture bound to the slot it fills. */
export interface SlotImage {
  slotIndex: number;
  image: CanvasImageSource;
  /** Intrinsic size, needed for the cover-crop maths. */
  width: number;
  height: number;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Draw one capture into one slot, cropping to fill.
 *
 * `cover` centre-crops so the slot is filled edge to edge with no distortion and no
 * letterbox gaps — the same choice a physical photobooth's optics make.
 */
function drawSlotImage(
  ctx: CanvasRenderingContext2D,
  slot: TemplateSlot,
  entry: SlotImage,
): void {
  const mode = slot.crop_mode ?? "cover";
  const slotAspect = slot.width / slot.height;
  const imgAspect = entry.width / entry.height;

  let sx = 0;
  let sy = 0;
  let sw = entry.width;
  let sh = entry.height;

  if (mode === "cover") {
    if (imgAspect > slotAspect) {
      sw = entry.height * slotAspect;
      sx = (entry.width - sw) / 2;
    } else {
      sh = entry.width / slotAspect;
      sy = (entry.height - sh) / 2;
    }
    ctx.drawImage(entry.image, sx, sy, sw, sh, slot.x, slot.y, slot.width, slot.height);
    return;
  }

  // contain: fit inside and centre, leaving the slot background visible.
  const scale = Math.min(slot.width / entry.width, slot.height / entry.height);
  const dw = entry.width * scale;
  const dh = entry.height * scale;
  ctx.drawImage(
    entry.image,
    0,
    0,
    entry.width,
    entry.height,
    slot.x + (slot.width - dw) / 2,
    slot.y + (slot.height - dh) / 2,
    dw,
    dh,
  );
}

/**
 * Composite captures into a template.
 *
 * Empty slots are drawn as placeholders rather than skipped, so a mid-session preview
 * shows the customer what the finished strip will look like and which frames are still
 * to come.
 */
export function composite(
  config: TemplateConfig,
  images: SlotImage[],
  options: { showPlaceholders?: boolean } = {},
): HTMLCanvasElement {
  const { width, height, background_color = "#FFFFFF" } = config.canvas;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = background_color;
  ctx.fillRect(0, 0, width, height);

  const byIndex = new Map(images.map((i) => [i.slotIndex, i]));

  for (const slot of config.slots) {
    const entry = byIndex.get(slot.index);
    const radius = slot.border?.radius ?? 0;

    ctx.save();
    if (slot.rotation) {
      ctx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
      ctx.rotate((slot.rotation * Math.PI) / 180);
      ctx.translate(-(slot.x + slot.width / 2), -(slot.y + slot.height / 2));
    }

    // Clip to the slot so a cover-crop cannot bleed into the margins.
    roundedRect(ctx, slot.x, slot.y, slot.width, slot.height, radius);
    ctx.clip();

    if (entry) {
      drawSlotImage(ctx, slot, entry);
    } else if (options.showPlaceholders !== false) {
      ctx.fillStyle = "#EFEFEF";
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
      ctx.fillStyle = "#B9B9B9";
      const size = Math.round(Math.min(slot.width, slot.height) * 0.18);
      ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        String(slot.index + 1),
        slot.x + slot.width / 2,
        slot.y + slot.height / 2,
      );
    }
    ctx.restore();

    if (slot.border?.width) {
      ctx.save();
      ctx.strokeStyle = slot.border.color ?? "#000000";
      ctx.lineWidth = slot.border.width;
      // Inset by half the stroke so the border sits inside the slot bounds.
      const inset = slot.border.width / 2;
      roundedRect(
        ctx,
        slot.x + inset,
        slot.y + inset,
        slot.width - slot.border.width,
        slot.height - slot.border.width,
        Math.max(0, radius - inset),
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  for (const deco of config.decorations ?? []) {
    if (deco.type !== "text" || !deco.content) continue;
    ctx.save();
    ctx.fillStyle = deco.color ?? "#000000";
    ctx.font = `${deco.font_size ?? 32}px ${deco.font_family ?? "Georgia, serif"}`;
    ctx.textAlign = deco.alignment ?? "center";
    ctx.textBaseline = "alphabetic";
    if (deco.letter_spacing) {
      // letterSpacing is Chromium-only; the text still renders without it elsewhere.
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
        `${deco.letter_spacing}px`;
    }
    ctx.fillText(resolvePlaceholders(deco.content), deco.x, deco.y);
    ctx.restore();
  }

  return canvas;
}

/** `{{date}}` in a decoration becomes the session's date — §12.2's text substitution. */
function resolvePlaceholders(content: string): string {
  return content.replace(/\{\{\s*date\s*\}\}/gi, () =>
    new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  );
}

/** Decode a stored image URL into something `composite` can draw. */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Could not load image: ${url}`));
    img.src = url;
  });
  return img;
}
