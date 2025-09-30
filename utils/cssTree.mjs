// ==============================
// LazyDocs — CSS Analyzer (canonical slug resolution + baseline lookup)
// ==============================
//
// This utility parses a CSS file, walks its AST, and maps declarations
// and at-rules to canonical feature slugs from `web-features`. It then
// attaches baseline support metadata and exports results in both
// console.table and Markdown formats.
//

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as csstree from "css-tree";
import { features } from "web-features";

// ESM-safe __dirname resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load canonical slugs from disk (dumped list of all valid IDs in web-features)
const canonicalSlugs = JSON.parse(
  fs.readFileSync(path.join(__dirname, "canonical-slugs.json"), "utf-8")
);

// ------------------------------------------------------------------
// Explicit mapping of common properties/values → candidate slugs
// ------------------------------------------------------------------
const explicitCandidates = {
  display: {
    grid: ["css-grid-layout", "css-grid", "grid"],
    flex: ["flexbox", "css-flexbox"],
  },
  "grid-template-columns": ["css-grid-layout", "css-grid"],
  "grid-template-rows": ["css-grid-layout", "css-grid"],
  gap: ["css-gap", "gap", "flexbox-gap"],
  color: ["css-color", "css-color-named", "color"],
  "font-size": ["css-fonts", "css-font-size"],
  "justify-content": ["flexbox", "css-flexbox"],
  "align-items": ["flexbox", "css-flexbox"],
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Return first candidate slug that exists in `features`. */
function pickExistingCandidate(candidates = []) {
  for (const c of candidates) {
    if (!c) continue;
    if (features[c]) return c;
    if (!c.startsWith("css-") && features[`css-${c}`]) return `css-${c}`;
  }
  return null;
}

/** Fuzzy fallback: try to find a matching slug from canonicalSlugs. */
function fuzzyFindSlug(keyword) {
  if (!keyword) return null;
  const k = keyword.toLowerCase();

  const exact = canonicalSlugs.find((s) => s.toLowerCase() === k && features[s]);
  if (exact) return exact;

  const cssPref = canonicalSlugs.find(
    (s) => s.toLowerCase().includes(`css-${k}`) && features[s]
  );
  if (cssPref) return cssPref;

  const contains = canonicalSlugs.find(
    (s) => s.toLowerCase().includes(k) && features[s]
  );
  return contains || null;
}

/** Normalize baseline info into a human-readable string. */
function getBaseline(featureObj) {
  if (!featureObj) return "unknown";
  const base = featureObj.status?.baseline;
  if (typeof base === "string") return base;
  if (base?.status) return `${base.status} (since ${base.since ?? "n/a"})`;
  return "unknown";
}

/**
 * Resolve CSS property + value → canonical feature slug.
 */
function resolveCanonicalSlug(prop, value) {
  if (!prop) return null;
  const v = String(value).trim().toLowerCase();

  // 1) explicit mapping
  const byProp = explicitCandidates[prop];
  if (byProp) {
    if (typeof byProp === "object" && !Array.isArray(byProp)) {
      const candidates = byProp[v] || byProp[v.split(/\s+/)[0]];
      const pick = pickExistingCandidate(
        Array.isArray(candidates) ? candidates : [candidates].filter(Boolean)
      );
      if (pick) return pick;
    } else if (Array.isArray(byProp)) {
      const pick = pickExistingCandidate(byProp);
      if (pick) return pick;
    }
  }

  // 2) token-based checks (grid/flex/gap/1fr/etc.)
  const token = v.split(/[^a-z0-9-]+/)[0] || v;
  if (["grid", "grid-layout"].some((t) => token.includes(t))) {
    return pickExistingCandidate(["css-grid-layout", "css-grid", "grid"]);
  }
  if (["flex", "flexbox"].includes(token)) {
    return pickExistingCandidate(["flexbox", "css-flexbox"]);
  }
  if (token === "gap") {
    return pickExistingCandidate(["css-gap", "gap", "flexbox-gap"]);
  }
  if (/^\d+fr$/i.test(token)) {
    return pickExistingCandidate(["css-grid-layout", "css-grid"]);
  }

  // 3) fuzzy fallbacks
  return fuzzyFindSlug(token) || fuzzyFindSlug(prop) || fuzzyFindSlug(v);
}

// ------------------------------------------------------------------
// Analyzer
// ------------------------------------------------------------------

async function analyzeCSS(filePath) {
  const css = fs.readFileSync(filePath, "utf-8");
  const ast = csstree.parse(css, { positions: true });
  const results = [];

  csstree.walk(ast, {
    enter(node) {
      if (node.type === "Declaration") {
        const prop = node.property;
        const value = csstree.generate(node.value);
        const slug = resolveCanonicalSlug(prop, value);
        const feature = slug ? features[slug] : null;

        results.push({
          type: node.type,
          syntax: `${prop}: ${value}`,
          feature: slug || "unknown",
          baseline: getBaseline(feature),
          loc: node.loc?.start
            ? `L${node.loc.start.line}:C${node.loc.start.column}`
            : "n/a",
        });
      }

      if (node.type === "Atrule") {
        const name = node.name;
        const slug = resolveCanonicalSlug(name, name);
        const feature = slug ? features[slug] : null;

        results.push({
          type: node.type,
          syntax: `@${name}`,
          feature: slug || "unknown",
          baseline: getBaseline(feature),
          loc: node.loc?.start
            ? `L${node.loc.start.line}:C${node.loc.start.column}`
            : "n/a",
        });
      }
    },
  });

  return results;
}

// ------------------------------------------------------------------
// Output Helpers
// ------------------------------------------------------------------

function resultsToMarkdownTable(results) {
  if (!results.length) return "No results";
  const headers = Object.keys(results[0]);
  const separator = headers.map(() => "---");
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...results.map((row) =>
      `| ${headers
        .map((h) => String(row[h] ?? "").replace(/\|/g, "\\|"))
        .join(" | ")} |`
    ),
  ];
  return lines.join("\n");
}

// ------------------------------------------------------------------
// CLI Entry
// ------------------------------------------------------------------

(async () => {
  try {
    const cssFile = path.join(__dirname, "test.css");
    const report = await analyzeCSS(cssFile);

    console.table(report); // Quick console view

    const md = resultsToMarkdownTable(report);
    fs.writeFileSync(path.join(__dirname, "results.md"), md, "utf-8");
    console.log("Results saved to results.md");
  } catch (err) {
    console.error("Analyzer error:", err);
    process.exitCode = 1;
  }
})();
