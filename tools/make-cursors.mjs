/**
 * Builds the two cursor drawings from the pencil the app already uses.
 *
 *   node tools/make-cursors.mjs
 *
 * Writes src/assets/draftsvgs_v2/cursor_pencil.svg and cursor_eraser.svg.
 *
 * Why a script rather than two files checked in by hand: the eraser is the
 * pencil turned end over end, and the crop is measured off the artwork. Both
 * should follow icon_edit.svg if it is ever redrawn, and neither is something
 * anybody should be maintaining by editing path data.
 *
 * Two things about cursor SVGs that are easy to get wrong and both fatal:
 *
 * 1. **They need an intrinsic size.** icon_edit.svg is `width="100%"
 *    height="100%"`, which is fine for an <img> and useless for a cursor —
 *    Chrome refuses an SVG cursor with no intrinsic dimensions and silently
 *    falls back to the keyword. Hence the explicit 32x32 here.
 *
 * 2. **The viewBox is the crop.** The source art sits inside a little padding,
 *    and a cursor is only 32px: trimming to the ink is the difference between a
 *    pencil and a small pencil in a box of nothing.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "..", "src", "assets", "draftsvgs_v2");

/**
 * The drawings, and what each is for.
 *
 * `ink` is where the artwork actually starts and stops as a fraction of its own
 * viewBox, measured by rasterising the source at 512px and scanning the alpha
 * channel for the first and last non-transparent row and column. A cursor is
 * only 32px: cropping to the ink is the difference between a drawing and a
 * small drawing in a box of nothing.
 */
const CURSORS = [
  {
    name: "cursor_pencil",
    source: "icon_edit.svg",
    viewBox: 173,
    ink: { x0: 9 / 512, y0: 11 / 512, x1: 502 / 512, y1: 502 / 512 },
    turned: false,
  },
  {
    /* Not different art — the same pencil turned end over end so the blunt end
       leads instead of the point. That is the gesture it stands for: you turn
       the pencil over to rub something out. */
    name: "cursor_eraser",
    source: "icon_edit.svg",
    viewBox: 173,
    ink: { x0: 9 / 512, y0: 11 / 512, x1: 502 / 512, y1: 502 / 512 },
    flip: "xy",
  },
  {
    /* The action icon, for the hit points. Changing somebody's HP is the one
       edit on the page that is an attack rather than a correction, and the
       pointer should say so before the click does.

       Mirrored, because the sword is drawn pointing up and to the RIGHT and a
       cursor points up and to the LEFT. Unflipped, the hotspot sat on the
       pommel and the blade trailed away from what you were aiming at; mirrored,
       the tip is the pointer. */
    name: "cursor_action",
    source: "icon_action.svg",
    viewBox: 173,
    ink: { x0: 8 / 512, y0: 11 / 512, x1: 503 / 512, y1: 502 / 512 },
    flip: "x",
  },
];

/**
 * The SVG transform for a flip, about the centre of the crop.
 *
 * "x" mirrors left-to-right, "y" top-to-bottom, "xy" is both — which is a 180°
 * turn, and written as one because that is what it means for the pencil.
 */
function flipTransform(flip, x0, y0, width, height) {
  const cx = x0 + width / 2;
  const cy = y0 + height / 2;
  if (flip === "xy") return `rotate(180 ${cx.toFixed(3)} ${cy.toFixed(3)})`;
  /* Mirror about x = cx is x' = 2cx - x, which is scale(-1) then translate. */
  if (flip === "x") return `translate(${(2 * cx).toFixed(3)} 0) scale(-1 1)`;
  if (flip === "y") return `translate(0 ${(2 * cy).toFixed(3)}) scale(1 -1)`;
  return null;
}

/** The size the cursor is drawn at. 32 is the size every platform agrees on. */
const SIZE = 32;

const header = (viewBox, source) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Generated from ${source} by tools/make-cursors.mjs. Do not edit by hand. -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${SIZE}" height="${SIZE}" viewBox="${viewBox}" version="1.1"
     style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">`;

for (const { name, source, viewBox, ink, flip } of CURSORS) {
  const svg = await readFile(join(assets, source), "utf8");
  const body = svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>"));

  const x0 = ink.x0 * viewBox;
  const y0 = ink.y0 * viewBox;
  const width = (ink.x1 - ink.x0) * viewBox;
  const height = (ink.y1 - ink.y0) * viewBox;
  const box = `${x0.toFixed(3)} ${y0.toFixed(3)} ${width.toFixed(3)} ${height.toFixed(3)}`;

  const transform = flipTransform(flip, x0, y0, width, height);
  const inner = transform ? `<g transform="${transform}">${body}</g>` : body;

  const out = `${header(box, source)}
${inner}
</svg>
`;
  await writeFile(join(assets, `${name}.svg`), out, "utf8");
  console.log(`wrote ${name}.svg`);
}

/* The hotspot goes at the leading corner of the ink — the pencil's point, the
   eraser's blunt end — which after the crop is the bottom-left of the box. The
   CSS in fixes.css carries these numbers. */
console.log("\nhotspots for the CSS:");
console.log("  pencil: 1 30");
console.log("  eraser: 1 26");
console.log("  action: 11 1    (the blade's point, measured after the mirror)");
