import { features } from "web-features";
import fs from "fs"
import path from "path"

const dir = path.join(process.cwd(), "test")
if(!fs.existsSync(dir)){
  fs.mkdirSync(dir, {recursive: true})
}

const feature = Object.keys(features)
const fileToCreate = path.join(dir, "feature.md")
fs.writeFileSync(fileToCreate, feature.join("\n"), "utf-8" )

// console.log(Object.keys(features).slice(0, 50));

// Pick some features to check
// const list = [
//   "fetch", // shorthand for api.fetch
//   "css-grid",
//   "websockets",
//   "service-workers"
// ];

// for (const f of list) {
//   console.log(
//     `${f}: ${features[f]?.status?.baseline || "not found"}`
//   );
// }
