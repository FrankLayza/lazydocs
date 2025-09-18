import { features } from "web-features";

// console.log(Object.keys(features).slice(0, 50));

// Pick some features to check
const list = [
  "fetch", // shorthand for api.fetch
  "css-grid",
  "websockets",
  "service-workers"
];

for (const f of list) {
  console.log(
    `${f}: ${features[f]?.status?.baseline || "not found"}`
  );
}
