const fs = require("fs").promises;
const path = require("path");
const { Linter } = require("eslint");
const { getComputeStatus, getFeatures } = require("./getFeatures");

let eslintConfig = null;
async function loadEslint() {
  if (!eslintConfig) {
    try {
      const module = await import("../eslint.config.mjs");
      eslintConfig = module.default; // Handle ES module default export
      if (!Array.isArray(eslintConfig)) {
        throw new Error("eslint.config.mjs must export an array");
      }
    } catch (err) {
      console.error("Error loading eslint.config.mjs:", err.message);
      throw err; // Rethrow to catch in caller
    }
  }
  return eslintConfig;
}

const linter = new Linter();
async function initialiseLinter() {
  const config = await loadEslint();
  try {
    // Defensive: only register parsers/rules when plugin objects are provided.
    config.forEach((cfg) => {
      try {
        if (
          cfg.languageOptions &&
          cfg.languageOptions.parser &&
          cfg.languageOptions.parser.meta &&
          cfg.languageOptions.parser.meta.name
        ) {
          // Some flat configs reference parser names rather than parser objects — skip those.
          linter.defineParser(
            cfg.languageOptions.parser.meta.name,
            cfg.languageOptions.parser
          );
        }

        if (cfg.plugins && typeof cfg.plugins === "object") {
          // Only define rules when plugin object exposes rule definitions
          const ruleMap = Object.entries(cfg.plugins).reduce(
            (rules, [name, plugin]) => {
              if (plugin && plugin.rules && typeof plugin.rules === "object") {
                Object.entries(plugin.rules).forEach(([ruleName, rule]) => {
                  rules[`${name}/${ruleName}`] = rule;
                });
              }
              return rules;
            },
            {}
          );
          if (Object.keys(ruleMap).length) linter.defineRules(ruleMap);
        }
      } catch {
        // Skip non-critical plugin/parser registration problems; ESLint engine will be used by default.
        // Log at debug level.
        // console.debug('skip plugin/parser registration', inner.message);
      }
    });
  } catch (err) {
    console.error("Error initializing linter:", err.message);
    throw err;
  }
}

// Scan to find files matching extensions (async, recursive)
async function findJSFiles(dir, exts = [".js"]) {
  const results = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await findJSFiles(fullPath, exts);
        results.push(...nested);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (exts.includes(ext)) results.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`findJSFiles error reading ${dir}: ${err.message}`);
  }
  return results;
}

// Analyze JS files
async function analyzeJSFiles(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    // Prefer the ESLint engine (supports flat config files). If it fails, fall back to the in-memory Linter.
    let messages = [];
    try {
      const { ESLint } = require("eslint");
      const overrideConfigFile = path.resolve(
        __dirname,
        "../eslint.config.mjs"
      );
      const engine = new ESLint({ overrideConfigFile });
      const res = await engine.lintText(content, { filePath });
      if (res && res.length) messages = res[0].messages || [];
    } catch {
      // Engine failed (maybe older eslint or config resolution issue) — fallback to Linter
      try {
        await initialiseLinter();
        const config = await loadEslint();
        const violations = linter.verify(
          content,
          { ...(config[0] || {}), filename: filePath },
          filePath
        );
        messages = violations;
      } catch (fallbackErr) {
        console.error(`Error initializing linter: ${fallbackErr.message}`);
        throw fallbackErr;
      }
    }

    const features = [];
    const relevant = messages.filter(
      (v) => v.ruleId && (v.ruleId.startsWith("es-x/") || v.ruleId === "compat/compat")
    );
    for (const msg of relevant) {
      const { feature, bcdKey } = extractFeatureFromMessage(msg);
      // Build a minimal entry even if we couldn't determine a BCD key
      const entry = {
        feature: feature || msg.message,
        bcdKey: bcdKey || null,
        line: msg.line,
        column: msg.column,
        file: path.basename(filePath),
        ruleId: msg.ruleId,
      };
      if (bcdKey) {
        const featureStatus = await queryFeatureStatus(bcdKey);
        Object.assign(entry, featureStatus);
      } else {
        entry.baselineStatus = 'unknown';
        entry.featureId = 'no direct match';
        entry.featureGroup = 'none';
      }
      features.push(entry);
    }
    return features;
  } catch (err) {
    console.error(`Error analyzing ${filePath}: ${err.message}`);
    return [];
  }
}

// Extract feature from violation messages
function extractFeatureFromMessage(message) {
  let feature = null;
  let bcdKey = null;

  if (message.ruleId?.startsWith("es-x/")) {
    // Example messages: "ES2023 Array.prototype.findLast is forbidden" or "ES2023 'String.prototype.at' is forbidden"
    const match = message.message.match(
      /es(\d{4})\s+([^\n]+?)\s+is forbidden/i
    );
    if (match) {
      // raw feature snippet may contain quotes/backticks and punctuation
      const raw = match[2].trim();
      const cleaned = raw.replace(/^['"`\s]+|['"`\s]+$/g, "");
      // normalize separators: keep dots, replace other non-alphanum with dot, collapse dots
      const slug = cleaned
        .replace(/[^0-9A-Za-z.]+/g, ".")
        .replace(/\.{2,}/g, ".")
        .replace(/^\.|\.$/g, "");
      feature = cleaned;
      bcdKey = `javascript.builtins.${slug}`;
    }
  }

  if (message.ruleId === "compat/compat") {
    // Examples: "Use of 'fetch' is not supported" or "Use of navigator.serviceWorker is not supported"
    const match = message.message.match(
      /use of ['"`]?([^'"`]+?)['"`]?(?:\s|$)/i
    );
    if (match) {
      const raw = match[1].trim();
      const cleaned = raw.replace(/^['"`\s]+|['"`\s]+$/g, "");
      // Build a slug like 'fetch' or 'navigator.serviceWorker'
      const slug = cleaned
        .replace(/[^0-9A-Za-z.]+/g, ".")
        .replace(/\.{2,}/g, ".")
        .replace(/^\.|\.$/g, "");
      feature = cleaned;
      bcdKey = `api.${slug}`;
    }
  }

  return { feature, bcdKey };
}

// Query features from baseline
async function queryFeatureStatus(bcdKey) {
  const status = await getComputeStatus(null, bcdKey);
  // getFeatures may be an async function that returns a features list — handle both cases.
  let featuresSource = null;
  try {
    if (typeof getFeatures === "function") {
      featuresSource = await getFeatures();
    } else {
      featuresSource = getFeatures;
    }
  } catch (err) {
    // If features can't be loaded, continue with empty source
    console.error("Warning: could not load features list:", err.message || err);
    featuresSource = {};
  }

  let matchingFeature = null;
  if (Array.isArray(featuresSource)) {
    matchingFeature = featuresSource.find(
      (f) => f.bcd && f.bcd.includes(bcdKey)
    );
  } else {
    matchingFeature = Object.values(featuresSource || {}).find((f) => {
      try {
        const fbcd = f && f["bcd"];
        return fbcd && Array.isArray(fbcd) && fbcd.includes(bcdKey);
      } catch {
        return false;
      }
    });
  }
  return {
    bcdKey,
    baselineStatus: status?.baseline || "unknown",
    featureId: matchingFeature ? matchingFeature.id : "no direct match",
    featureGroup: matchingFeature ? matchingFeature.group : "none",
  };
}

// Main function to scan a folder
async function scanJsFolder(folderPath) {
  try {
    console.log(`Scanning: ${folderPath}`);
    const jsFiles = await findJSFiles(path.resolve(folderPath));
    const allResults = [];

    for (const file of jsFiles) {
      console.log(`Processing ${file}`);
      const features = await analyzeJSFiles(file);
      // Determine supported features (heuristic)
      const isSupported = (status) => {
        if (!status) return false;
        const s = String(status).toLowerCase();
        return ['supported', 'yes', 'true', 'available', 'stable', 'implemented'].includes(s);
      };
      const supported = features.filter((f) => isSupported(f.baselineStatus));
      const unsupportedCount = features.length - supported.length;
      console.log(`Found ${features.length} feature(s): ${supported.length} supported, ${unsupportedCount} unsupported`);
      if (supported.length) {
        console.log('Supported features:');
        for (const s of supported) console.log(`  - ${s.feature} (line ${s.line}) status=${s.baselineStatus}`);
      }
      allResults.push({ file, results: features, supported });
    }

    // Write results into the project's utils folder (folderPath is the project root)
    const outputPath = path.join(folderPath, "utils", "jsscan-results.json");
    await fs.writeFile(outputPath, JSON.stringify(allResults, null, 2));
    console.log(`Results written to ${outputPath}`);
    return allResults;
  } catch (err) {
    console.error(`Error scanning folder ${folderPath}: ${err.message}`);
    return [];
  }
}

// Run the scanner
module.exports = { scanJsFolder };
