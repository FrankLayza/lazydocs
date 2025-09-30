// save as dump-slugs.mjs
import { features } from "web-features";
import fs from "fs";

// Get all canonical slugs (the keys of the features object)
const slugs = Object.keys(features);

// Write to a JSON file
fs.writeFileSync("canonical-slugs.json", JSON.stringify(slugs, null, 2));

console.log(`Dumped ${slugs.length} slugs into canonical-slugs.json`);
