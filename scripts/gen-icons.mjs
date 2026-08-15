// Generates public/icon-192.png and public/icon-512.png: a solid #14171C
// square with a bold white "M" centered, generous padding for PWA maskable use.
import { writeFileSync } from "node:fs";
import { drawM, encodePNG } from "./icon-lib.mjs";

for (const size of [192, 512]) {
  const png = encodePNG(size, drawM(size));
  const outPath = new URL(`../public/icon-${size}.png`, import.meta.url);
  writeFileSync(outPath, png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}
