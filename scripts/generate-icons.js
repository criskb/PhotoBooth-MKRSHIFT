import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import png2icons from "png2icons";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const assetsDir = path.join(rootDir, "assets");
const sourcePng = path.join(assetsDir, "icon.png");
const outIcns = path.join(assetsDir, "icon.icns");
const outIco = path.join(assetsDir, "icon.ico");

if (!fs.existsSync(sourcePng)) {
  console.error(`Missing source icon at ${sourcePng}`);
  process.exit(1);
}

const input = fs.readFileSync(sourcePng);
const icns = png2icons.createICNS(input, png2icons.BILINEAR, 0);
if (!icns) {
  console.error("Failed to generate ICNS file.");
  process.exit(1);
}
fs.writeFileSync(outIcns, icns);

const ico = png2icons.createICO(input, png2icons.BILINEAR, 0, true);
if (!ico) {
  console.error("Failed to generate ICO file.");
  process.exit(1);
}
fs.writeFileSync(outIco, ico);

console.log("Generated icon.icns and icon.ico in assets/.");
