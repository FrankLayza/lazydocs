// jsScanner.js
const fs = require('fs').promises;
const path = require('path');
const { Linter } = require('eslint');
const { getFeatures, getComputeStatus } = require('./getFeatures');

// Load eslint.config.mjs directly
const config = require('../eslint.config.mjs');

const linter = new Linter();
config.forEach(cfg => {
  if (cfg.languageOptions?.parser) {
    linter.defineParser(cfg.languageOptions.parser.meta.name, cfg.languageOptions.parser);
  }
  if (cfg.plugins) {
    linter.defineRules(Object.entries(cfg.plugins).reduce((rules, [name, plugin]) => {
      Object.entries(plugin.rules || {}).forEach(([ruleName, rule]) => {
        rules[`${name}/${ruleName}`] = rule;
      });
      return rules;
    }, {}));
  }
});

// Scan JS files
async function getJsFiles(folderPath) {
  const files = await fs.readdir(folderPath);
  return files
    .filter(file => path.extname(file).toLowerCase() === '.js')
    .map(file => path.join(folderPath, file));
}

// Lint file content
async function lintJsContent(content, filename) {
  return linter.verify(content, { ...config[0], filename }, filename);
}

// Extract feature from violation messages
async function extractFeatureFromMessage(message) {
  const text = message.message.toLowerCase();
  let feature = null;
  let bcdKey = null;

  // es-x: e.g., "ES2023 Array.prototype.findLast method is forbidden"
  if (message.ruleId?.startsWith('es-x/')) {
    const match = text.match(/es(\d{4})\s+(.+?)\s+(?:method|is forbidden)/i);
    if (match) {
      feature = match[2].trim();
      bcdKey = `javascript.builtins.${feature.replace(/\./g, '.')}`;
    }
  }

  // compat: e.g., "fetch is not supported" or "navigator.serviceWorker() is not supported"
  if (message.ruleId === 'compat/compat') {
    const match = text.match(/['"`]?([^'"`]+)['"`]?\s+is not supported/i) || text.match(/([^ ]+)\(\)/i);
    if (match) {
      feature = match[1].toLowerCase();
      bcdKey = feature.includes('.')
        ? `api.${feature.replace(/\./g, '.')}`
        : `api.${feature.charAt(0).toUpperCase() + feature.slice(1)}`;
    }
  }

  // Custom mapping for specific APIs
  const featureMap = {
    'abortsignal': 'api.AbortSignal',
    'abortsignal.any': 'api.AbortSignal.any',
    'array.prototype.includes': 'javascript.builtins.Array.includes',
    'array.prototype.findlast': 'javascript.builtins.Array.findLast',
    'string.prototype.iswellformed': 'javascript.builtins.String.isWellFormed',
    'requestidlecallback': 'api.requestIdleCallback',
    'navigator.serviceworker': 'api.Navigator.serviceWorker',
    'websocket': 'api.WebSocket',
    'fetch': 'api.Fetch',
    'localstorage': 'api.Storage.localStorage',
  };
  if (!bcdKey && feature) bcdKey = featureMap[feature.toLowerCase()];

  if (!feature && !bcdKey) {
    console.warn(`Unmapped ESLint violation: ${message.message} (rule: ${message.ruleId})`);
  }

  return { feature, bcdKey };
}

// Query web-features
let cachedWebFeatures = null;
async function queryFeatureStatus(bcdKey) {
  if (!cachedWebFeatures) cachedWebFeatures = await getFeatures();
  const status = await getComputeStatus(null, bcdKey);
  const matchingFeature = Object.values(cachedWebFeatures).find(f => f.bcd && f.bcd.includes(bcdKey));
  return {
    bcdKey,
    baselineStatus: status?.baseline || 'unknown',
    featureId: matchingFeature ? matchingFeature.id : 'no direct match',
    featureGroup: matchingFeature ? matchingFeature.group : 'none'
  };
}

// Main scanner
async function scanJsFolder(folderPath) {
  const jsFiles = await getJsFiles(folderPath);
  const allResults = [];

  for (const file of jsFiles) {
    console.log(`Processing ${file}`);
    const content = await fs.readFile(file, 'utf-8');
    const violations = await lintJsContent(content, path.basename(file));

    const fileResults = await Promise.all(
      violations
        .filter(v => v.ruleId.startsWith('es-x/') || v.ruleId === 'compat/compat')
        .map(async violation => {
          const { feature, bcdKey } = await extractFeatureFromMessage(violation);
          if (feature && bcdKey) {
            return { ...(await queryFeatureStatus(bcdKey)), line: violation.line, file };
          }
          return null;
        })
    );

    const filteredResults = fileResults.filter(Boolean);
    allResults.push({ file, results: filteredResults });
    console.log(`Found ${filteredResults.length} unsupported features`);
  }

  console.log(JSON.stringify(allResults, null, 2));
}

(async () => {
  const folder = process.argv[2] || './';
  try {
    await scanJsFolder(path.resolve(folder));
  } catch (err) {
    console.error('Error scanning folder:', err);
  }
})();