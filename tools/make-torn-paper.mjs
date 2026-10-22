/**
 * Builds the torn edges of the player page's notepaper.
 *
 *   node tools/make-torn-paper.mjs
 *
 * Writes four masks to src/assets/draftsvgs_v2:
 *
 *   paper_torn-top.svg          where the ruled sheet stops, along the top
 *   paper_torn-top-fibres.svg   the bare fibres that stick out past it
 *   paper_torn-bottom.svg       the same pair along the bottom, torn
 *   paper_torn-bottom-fibres.svg  differently so it does not read as a mirror
 *
 * They are masks, so only their shape matters: black is paper, clear is desk.
 * Each is a strip one tear deep that repeats sideways, which is what lets one
 * file edge a scrap of any width.
 *
 * Why two layers per edge: when paper tears, the surface with the ruling on it
 * gives way a hair before the fibres underneath do. So the blue rules stop
 * short of the very edge, and a thin rim of bare paper stands out past them.
 * That rim is most of what makes an edge read as torn rather than cut with
 * pinking shears — the page draws it as a plain layer under the ruled one.
 *
 * The tear line is a sum of sines with a whole number of cycles across the
 * tile, which is what makes it seamless: every term is periodic in the tile's
 * width, so the right end meets the left exactly. Broad wander, then ripples,
 * then a fine tooth, then a scatter of fibres pulled out of the edge. Like the
 * hand art, these are sampled polylines — change the maths here and re-run.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "assets", "draftsvgs_v2");

/* One unit is one CSS pixel: the page sizes the strip by its height and keeps
   the ratio. Wide enough that a phone never sees it repeat. */
const W = 720;
const H = 26;
const TAU = Math.PI * 2;

/** mulberry32 — small, seeded, and the same on every machine. */
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance between two points on a loop of length W. */
const around = (a, b) => {
  const d = Math.abs(a - b) % W;
  return Math.min(d, W - d);
};

/** A periodic wobble built from whole cycles, so it tiles. */
function waves(rnd, from, to, step, amp, fall) {
  const list = [];
  for (let k = from; k <= to; k += step(rnd)) {
    list.push({ k, a: (amp / Math.pow(k / from, fall)) * (0.5 + rnd()), p: rnd() * TAU });
  }
  return (x) => list.reduce((y, w) => y + w.a * Math.sin((TAU * w.k * x) / W + w.p), 0);
}

/** Fibres: short spikes of paper pulled outward from the line. */
function fibres(rnd, count, width, height) {
  const list = Array.from({ length: count }, () => ({
    x: rnd() * W,
    w: width[0] + rnd() * (width[1] - width[0]),
    /* Squared, so most are stubs and a few are long. */
    h: height[0] + rnd() * rnd() * (height[1] - height[0]),
  }));
  return (x) =>
    list.reduce((y, f) => {
      const d = around(x, f.x);
      return d < f.w ? y + f.h * (1 - d / f.w) : y;
    }, 0);
}

/**
 * One edge, as depth from the outside of the strip. `paper` is where the ruled
 * sheet stops; `bare` is where the fibres stop, always a little further out.
 */
function tear(seed) {
  const rnd = random(seed);
  const wander = waves(rnd, 1, 6, () => 1, 4.2, 0.7);
  const ripple = waves(rnd, 7, 60, (r) => 1 + Math.floor(r() * 3), 1.3, 0.8);
  const tooth = waves(rnd, 61, 230, (r) => 3 + Math.floor(r() * 5), 0.35, 0);
  const pulled = fibres(rnd, 30, [1, 3.5], [0.5, 3.2]);

  const rim = waves(rnd, 3, 40, (r) => 1 + Math.floor(r() * 4), 0.55, 0.5);
  const fuzz = waves(rnd, 90, 300, (r) => 4 + Math.floor(r() * 6), 0.35, 0);
  const strands = fibres(rnd, 50, [0.5, 1.4], [0.5, 2.6]);

  const xs = Array.from({ length: W + 1 }, (_, x) => x);
  const line = xs.map((x) => wander(x) + ripple(x) + tooth(x) - pulled(x));

  /* Fit the torn line into the strip: its deepest bite well clear of the
     inside edge (which must stay solid paper), its highest fibre clear of the
     outside so the rim has room past it. */
  const lo = Math.min(...line);
  const hi = Math.max(...line);
  const top = 4;
  const bottom = H - 3;
  const paper = line.map((v) => top + ((v - lo) / (hi - lo)) * (bottom - top));
  const bare = xs.map((x, i) =>
    Math.max(0.4, paper[i] - (0.9 + 0.6 * rim(x)) - Math.abs(fuzz(x)) - strands(x)),
  );
  return { paper, bare };
}

const n1 = (v) => (Math.round(v * 10) / 10).toString();

/** A strip that is solid below (or above) a torn line. */
function strip(depths, side) {
  const inward = side === "top" ? H : 0;
  const at = (d) => (side === "top" ? d : H - d);
  const points = depths.map((d, x) => `${x},${n1(at(d))}`).join(" L");
  return `M0,${inward} L${points} L${W},${inward} Z`;
}

function write(name, side, depths, what) {
  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- ${what} Generated by tools/make-torn-paper.mjs;
     the edge is a sampled polyline, so change the maths there rather than
     this file. A mask: black is paper. Tiles sideways without a seam. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <path fill="#000" d="${strip(depths, side)}"/>
</svg>
`;
  writeFileSync(join(OUT, name), svg);
  console.log(`wrote ${name} (${svg.length} bytes)`);
}

const top = tear(20260919);
const bottom = tear(9171);

write("paper_torn-top.svg", "top", top.paper, "Notepaper, torn along the top: where the ruled surface stops.");
write("paper_torn-top-fibres.svg", "top", top.bare, "Notepaper, torn along the top: the bare fibres past the ruling.");
write("paper_torn-bottom.svg", "bottom", bottom.paper, "Notepaper, torn along the bottom: where the ruled surface stops.");
write("paper_torn-bottom-fibres.svg", "bottom", bottom.bare, "Notepaper, torn along the bottom: the bare fibres past the ruling.");
