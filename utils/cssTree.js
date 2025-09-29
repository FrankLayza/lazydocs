// Import Node.js 'fs' for reading/writing files
import fs from "fs";
// Import css-tree for parsing CSS into an AST
import * as csstree from "css-tree";

async function analyzeCSS(filePath) {
    // Import the features object from web-features
    const { features } = await import("web-features");

    // Read CSS file from disk
    const css = fs.readFileSync(filePath, "utf-8");

    // Parse CSS into an AST (Abstract Syntax Tree)
    const ast = csstree.parse(css, { positions: true });
    const results = [];

    /**
     * Smarter mapping of CSS → web-features
     * Helps reduce "unknown" entries by mapping common patterns.
     */
    function mapToFeature(prop, value) {
        const mappings = {
            display: {
                grid: "css-grid",
                flex: "css-flexbox",
            },
            gap: "css-gap",
            color: "css-color",
            "font-size": "css-fonts",
        };

        // Property-specific mapping
        if (mappings[prop]) {
            if (typeof mappings[prop] === "string") return mappings[prop];
            if (mappings[prop][value]) return mappings[prop][value];
        }

        // Value/unit-based fallbacks
        if (/^\d+(px|em|rem|%)$/i.test(value)) return "css-values-length"; // e.g., 16px, 2em
        if (/^\d+fr$/i.test(value)) return "css-grid";                     // e.g., 1fr
        if (/^(red|blue|green|black|white|transparent)$/i.test(value))
            return "css-color-named";                                      // named colors

        return null; // fallback to unknown
    }

    /**
     * Helper: fuzzy match against `web-features`
     * Used when no direct mapping is found.
     */
    function findFeature(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        for (const [id, data] of Object.entries(features)) {
            if (id.toLowerCase().includes(lowerKeyword)) {
                return { id, ...data };
            }
        }
        return null;
    }

    // Walk through the AST — inspects declarations, selectors, at-rules, etc.
    csstree.walk(ast, {
        enter(node) {
            switch (node.type) {
                case "Declaration": {
                    const prop = node.property;                  // e.g., "display"
                    const value = csstree.generate(node.value);  // e.g., "grid"

                    // Step 1: Try smarter mapping
                    let featureId = mapToFeature(prop, value);

                    // Step 2: Fallback to fuzzy search if no mapping
                    let feature = featureId
                        ? { id: featureId, ...features[featureId] }
                        : findFeature(`css-${prop}`) || findFeature(`css-${value}`);

                    results.push({
                        type: node.type,
                        syntax: `${prop}: ${value}`,
                        feature: feature?.id || "unknown",
                        baseline: feature?.status?.baseline || "unknown",
                        loc: node.loc?.start
                            ? `L${node.loc.start.line}:C${node.loc.start.column}`
                            : "n/a",
                    });
                    break;
                }

                case "TypeSelector":
                case "ClassSelector":
                case "IdSelector":
                case "PseudoClassSelector":
                case "PseudoElementSelector": {
                    // Handle selectors (e.g., h1, .title, #id, :hover)
                    const sel = csstree.generate(node);
                    let feature = findFeature(`css-${sel}`);
                    results.push({
                        type: node.type,
                        syntax: sel,
                        feature: feature?.id || "unknown",
                        baseline: feature?.status?.baseline || "unknown",
                        loc: node.loc?.start
                            ? `L${node.loc.start.line}:C${node.loc.start.column}`
                            : "n/a",
                    });
                    break;
                }

                case "Atrule": {
                    // Handle @rules (e.g., @media, @keyframes)
                    const atRule = `@${node.name}`;
                    let feature = findFeature(`css-${node.name}`);
                    results.push({
                        type: node.type,
                        syntax: atRule,
                        feature: feature?.id || "unknown",
                        baseline: feature?.status?.baseline || "unknown",
                        loc: node.loc?.start
                            ? `L${node.loc.start.line}:C${node.loc.start.column}`
                            : "n/a",
                    });
                    break;
                }

                default: {
                    // For everything else (functions, values, etc.)
                    try {
                        const generated = csstree.generate(node);
                        if (generated.trim()) {
                            let feature = findFeature(`css-${generated}`);
                            results.push({
                                type: node.type,
                                syntax: generated,
                                feature: feature?.id || "unknown",
                                baseline: feature?.status?.baseline || "unknown",
                                loc: node.loc?.start
                                    ? `L${node.loc.start.line}:C${node.loc.start.column}`
                                    : "n/a",
                            });
                        }
                    } catch {
                        // Some nodes (like Block, Raw) may not generate cleanly
                    }
                }
            }
        },
    });

    return results;
}

/**
 * Helper: Convert analysis results into a Markdown table
 * Ensures proper rendering in Markdown viewers
 */
function resultsToMarkdownTable(results) {
    if (results.length === 0) return "No results";

    const headers = Object.keys(results[0]);
    const separator = headers.map(() => "---");

    const lines = [
        `| ${headers.join(" | ")} |`,
        `| ${separator.join(" | ")} |`,
        ...results.map(row =>
            `| ${headers.map(h => {
                let val = String(row[h] ?? "");
                // Escape vertical bars so Markdown table isn’t broken
                return val.replace(/\|/g, "\\|");
            }).join(" | ")} |`
        ),
    ];

    return lines.join("\n");
}

// Example usage
(async () => {
    const report = await analyzeCSS("./test.css");

    // Show results in terminal as formatted table
    console.table(report);

    // Save results to Markdown file
    const mdTable = resultsToMarkdownTable(report);
    fs.writeFileSync("results.md", mdTable, "utf-8");

    console.log("Results saved to results.md");
})();
