/**
 * §11.1 filters as canvas operations.
 *
 * The real build loads `.cube` 3D LUTs (§11.2). No sample `.cube` files exist, so each
 * filter here is a CSS filter string applied through the canvas 2D context — the same
 * declaration used for the live preview, so what the customer sees while posing is what
 * they get in the print.
 *
 * Names match §11.1 exactly and come from the seeded `luts` table, so a LUT loader can
 * replace `apply()` without the UI changing.
 */

export interface FilterDef {
  id: string;
  name: string;
  description: string | null;
  /** A CSS filter function list, or "none". */
  css: string;
}

/** Fallback set, used only if the API call for LUTs fails — keeps the kiosk usable. */
export const FALLBACK_FILTERS: FilterDef[] = [
  { id: "normal", name: "Normal", description: "No processing", css: "none" },
  { id: "bw", name: "Black & White", description: "Grayscale", css: "grayscale(1)" },
  {
    id: "vintage",
    name: "Vintage",
    description: "Warm, faded",
    css: "sepia(0.45) contrast(1.08) saturate(1.15) brightness(1.03)",
  },
  { id: "warm", name: "Warm", description: "Warm tone", css: "saturate(1.25) hue-rotate(-12deg) brightness(1.05)" },
  { id: "cool", name: "Cool", description: "Cool tone", css: "saturate(1.1) hue-rotate(14deg) brightness(1.02)" },
  { id: "film", name: "Film", description: "Analog film", css: "contrast(1.15) saturate(0.9) sepia(0.15)" },
];

export function cssFor(filter: FilterDef | null | undefined): string {
  const css = filter?.css?.trim();
  return !css || css === "none" ? "none" : css;
}

/**
 * Render `source` into a new canvas with the filter baked into the pixels.
 *
 * Canvas `ctx.filter` is what makes this a two-line operation instead of hand-written
 * pixel loops; it is supported in Chrome and Edge, which the plan scopes to. If it is
 * missing the source is copied through unfiltered rather than throwing — losing the
 * look is recoverable, losing the photo is not.
 */
export function applyFilter(source: HTMLCanvasElement, filter: FilterDef | null): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d")!;
  const css = cssFor(filter);
  if (css !== "none" && "filter" in ctx) {
    ctx.filter = css;
  }
  ctx.drawImage(source, 0, 0);
  ctx.filter = "none";
  return out;
}

export function supportsCanvasFilter(): boolean {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx || !("filter" in ctx)) return false;
  ctx.filter = "grayscale(1)";
  return ctx.filter === "grayscale(1)";
}
