const fs = require("fs").promises;
const path = require("path");

// --- Special overrides ---
const overrides = {
  fetch: "fetch",
  XMLHttpRequest: "xhr",
  WebSocket: "websockets",
  EventSource: "eventsource",
  "navigator.serviceWorker": "service-workers",
  "document.querySelector": "querySelector",
  localStorage: "storage",
  sessionStorage: "storage",
  indexedDB: "indexeddb",
  caches: "cache-api",
  Promise: "promises",
  async: "async-await",
  await: "async-await",
};

// --- Load and filter JS features from features.md ---
async function loadJsFeatures() {
  const featuresPath = path.join(__dirname, "../test/feature.md");
  try {
    const content = await fs.readFile(featuresPath, "utf-8");
    return content
      .split("\n")
      .map(line => line.trim())
      .filter(line => line && (
        line.match(/^(array-|async-|bigint|class-|destructuring|generators|iterators|promise-|regexp-|string-|typed-array|javascript|symbol|weakmap|weakset|exponentiation|optional-|nullish-|template-literals|requestidlecallback)/i) ||
        line.match(/^(fetch|abortable-fetch|aborting|atomics-|broadcast-channel|compression-streams|event-|intl-|webgl|webrtc|websockets|webxr|web-animations|web-audio|web-bluetooth|web-cryptography|web-locks|web-midi|web-nfc|web-otp|webauthn|webcodecs|webgpu|webhid|webnn|webusb|webvr|webvtt|worker)/i)
      ));
  } catch (err) {
    console.error(`Error reading ${featuresPath}: ${err.message}`);
    return [];
  }
}

// --- Build mappings ---
async function buildMappings() {
  const features = await loadJsFeatures();
  const mapping = {};
  const unmapped = [];

  for (const featureId of features) {
    const parts = featureId.split("-");
    const prefix = parts[0].toLowerCase();

    if (prefix === "array") {
      const method = parts.slice(1).join("-");
      mapping[`Array.prototype.${method}`] = featureId;
    } else if (prefix === "string") {
      const method = parts.slice(1).join("-");
      mapping[`String.prototype.${method}`] = featureId;
    } else if (prefix === "object") {
      const method = parts.slice(1).join("-");
      mapping[`Object.${method}`] = featureId;
    } else if (prefix === "regexp") {
      const method = parts.slice(1).join("-");
      mapping[`RegExp.prototype.${method}`] = featureId;
    } else if (prefix === "typed" && parts[1] === "array") {
      const type = parts.slice(2).join("-");
      mapping[`${type.charAt(0).toUpperCase() + type.slice(1)}Array`] = featureId;
    } else if (prefix === "intl") {
      mapping[`Intl`] = "intl";
      if (featureId.includes("datetimeformat")) mapping[`Intl.DateTimeFormat`] = featureId;
      if (featureId.includes("numberformat")) mapping[`Intl.NumberFormat`] = featureId;
      if (featureId.includes("relativetimeformat")) mapping[`Intl.RelativeTimeFormat`] = featureId;
      if (featureId.includes("pluralrules")) mapping[`Intl.PluralRules`] = featureId;
      if (featureId.includes("list-format")) mapping[`Intl.ListFormat`] = featureId;
      if (featureId.includes("segmenter")) mapping[`Intl.Segmenter`] = featureId;
      if (featureId.includes("displaynames")) mapping[`Intl.DisplayNames`] = featureId;
      if (featureId.includes("durationformat")) mapping[`Intl.DurationFormat`] = featureId;
    } else if (prefix === "promise") {
      const method = parts.slice(1).join("-");
      mapping[`Promise.${method}`] = featureId;
    } else if (featureId === "url") {
      mapping[`URL`] = "url";
    } else if (featureId === "urlsearchparams") {
      mapping[`URLSearchParams`] = "urlsearchparams";
    } else if (prefix === "bigint") {
      mapping[`BigInt`] = "bigint";
    } else if (featureId === "javascript") {
      mapping[`javascript`] = "javascript";
    } else if (prefix === "symbol") {
      mapping[`Symbol`] = "symbol";
    } else if (prefix === "weakmap") {
      mapping[`WeakMap`] = "weakmap";
    } else if (prefix === "weakset") {
      mapping[`WeakSet`] = "weakset";
    } else if (prefix === "class") {
      mapping[`ClassDeclaration`] = "class-syntax";
      mapping[`ClassExpression`] = "class-syntax";
    } else if (prefix === "async") {
      mapping[`FunctionDeclaration:async`] = "async-await";
      mapping[`FunctionExpression:async`] = "async-await";
      mapping[`AwaitExpression`] = "async-await";
    } else if (prefix === "generators") {
      mapping[`FunctionDeclaration:generator`] = "generators";
      mapping[`FunctionExpression:generator`] = "generators";
      mapping[`YieldExpression`] = "generators";
    } else if (prefix === "iterators") {
      mapping[`ForOfStatement`] = "iterators";
    } else if (prefix === "async" && parts[1] === "iterators") {
      mapping[`ForAwaitOfStatement`] = "async-iterators";
    } else if (prefix === "destructuring") {
      mapping[`ObjectPattern`] = "destructuring";
      mapping[`ArrayPattern`] = "destructuring";
    } else if (prefix === "template") {
      mapping[`TemplateLiteral`] = "template-literals";
    } else if (prefix === "exponentiation") {
      mapping[`BinaryExpression:**`] = "exponentiation";
    } else if (prefix === "optional") {
      mapping[`ChainExpression`] = "optional-chaining";
    } else if (prefix === "nullish") {
      mapping[`LogicalExpression:??`] = "nullish-coalescing";
    } else {
      const camelCase = featureId
        .split("-")
        .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
      mapping[camelCase] = featureId;
    }
  }

  if (unmapped.length) {
    console.warn(`Unmapped JS features: ${unmapped.join(", ")}`);
  }

  return { ...mapping, ...overrides };
}

// --- Main execution ---
async function generateFeatureMappings() {
  try {
    const featureMappings = await buildMappings();
    const out = `// Auto-generated mapping (do not edit manually)\nconst featureMappings = ${JSON.stringify(featureMappings, null, 2)};\nmodule.exports = { featureMappings };\n`;
    await fs.writeFile(path.join(__dirname, "./featureMappings.js"), out, "utf-8");
    console.log("✅ featureMappings.js generated successfully");
  } catch (err) {
    console.error(`Error generating featureMappings.js: ${err.message}`);
  }
}

generateFeatureMappings();