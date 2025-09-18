const fs = require("fs");

// --- Special overrides: things the dataset doesn't expose in AST form ---
const overrides = {
  fetch: "fetch",
  XMLHttpRequest: "xhr",
  WebSocket: "websockets",
  EventSource: "eventsource",
  "navigator.serviceWorker": "service-workers",

  localStorage: "storage",
  sessionStorage: "storage",
  indexedDB: "indexeddb",
  caches: "cache-api",

  Promise: "promises",
  async: "async-functions",
  await: "async-functions",
};

// --- Build automatic mappings ---
function buildMappings(features) {
  const mapping = {};

  for (const featureId of Object.keys(features)) {
    const feature = features[featureId];
    const name = feature.name || "";

    // === Array methods ===
    if (featureId.startsWith("array-")) {
      const method = featureId.replace("array-", "");
      mapping[`Array.prototype.${method}`] = featureId;
    }

    // === String methods ===
    if (featureId.startsWith("string-")) {
      const method = featureId.replace("string-", "");
      mapping[`String.prototype.${method}`] = featureId;
    }

    // === Object methods ===
    if (featureId.startsWith("object-")) {
      const method = featureId.replace("object-", "");
      mapping[`Object.${method}`] = featureId;
    }

    // === Number methods ===
    if (featureId.startsWith("number-")) {
      const method = featureId.replace("number-", "");
      mapping[`Number.${method}`] = featureId;
    }

    // === Math methods ===
    if (featureId.startsWith("math-")) {
      const method = featureId.replace("math-", "");
      mapping[`Math.${method}`] = featureId;
    }

    // === Date ===
    if (featureId.startsWith("date-")) {
      const method = featureId.replace("date-", "");
      mapping[`Date.${method}`] = featureId;
    }

    // === Intl API ===
    if (featureId.startsWith("intl")) {
      mapping[`Intl`] = "intl"; // base Intl
      if (featureId.includes("datetimeformat"))
        mapping[`Intl.DateTimeFormat`] = featureId;
      if (featureId.includes("numberformat"))
        mapping[`Intl.NumberFormat`] = featureId;
      if (featureId.includes("relativetimeformat"))
        mapping[`Intl.RelativeTimeFormat`] = featureId;
    }

    // === URL ===
    if (featureId === "url") mapping[`URL`] = "url";
    if (featureId === "urlsearchparams")
      mapping[`URLSearchParams`] = "urlsearchparams";
  }

  // Merge with overrides (overrides take priority)
  return { ...mapping, ...overrides };
}

(async () => {
  const { features } = await import("web-features");
  const featureMappings = buildMappings(features);

  // Write to featureMappings.js
  const out = `// Auto-generated mapping (do not edit manually)
const featureMappings = ${JSON.stringify(featureMappings, null, 2)};
module.exports = { featureMappings };
`;

  fs.writeFileSync("./featureMappings.js", out, "utf-8");
  console.log("✅ featureMappings.js generated successfully");
})();