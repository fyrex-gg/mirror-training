// Replaces Capacitor's default generic launcher icon with the same "M" mark
// used by the PWA — legacy square + round mipmaps, and a transparent
// foreground layer (smaller boxFrac so it survives adaptive-icon masking)
// paired with a solid-color background set directly in ic_launcher_background.xml.
import { writeFileSync, readFileSync } from "node:fs";
import { drawM, circleCrop, encodePNG } from "./icon-lib.mjs";

const RES = new URL("../android/app/src/main/res/", import.meta.url);
// legacy launcher size -> matching adaptive-icon foreground size (2.25x, Android convention)
const DENSITIES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

for (const [density, legacySize] of Object.entries(DENSITIES)) {
  const dir = new URL(`mipmap-${density}/`, RES);

  const square = drawM(legacySize);
  writeFileSync(new URL("ic_launcher.png", dir), encodePNG(legacySize, square));

  const round = circleCrop(legacySize, square);
  writeFileSync(new URL("ic_launcher_round.png", dir), encodePNG(legacySize, round));

  const fgSize = Math.round(legacySize * 2.25);
  const fg = drawM(fgSize, { boxFrac: 0.34, transparent: true });
  writeFileSync(new URL("ic_launcher_foreground.png", dir), encodePNG(fgSize, fg));

  console.log(`wrote mipmap-${density}: ${legacySize}px launcher + ${fgSize}px foreground`);
}

const bgPath = new URL("values/ic_launcher_background.xml", RES);
const bgXml = readFileSync(bgPath, "utf8").replace(/#FFFFFF/i, "#14171C");
writeFileSync(bgPath, bgXml);
console.log("set adaptive-icon background to #14171C");
