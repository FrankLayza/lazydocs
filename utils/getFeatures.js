import { config } from "dotenv";

async function getFeatures() {
  const { features } = await import("web-features");
  return features;
}

async function getComputeStatus(a, b) {
  const { getStatus } = await import("compute-baseline");
  return getStatus(a, b);
}

// async function getEslint(){
//     const {config} = await import("../eslint.config.mjs")
//     return config
// }
module.exports = { getFeatures, getComputeStatus, };
