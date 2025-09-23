const fs = require("fs");
const path = require("path");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { getWebFeatures } = require("./getWebFeature");
const { featureMappings } = require("./data/featureMappings");

/**
 * Helper to recursively build member expression string
 * e.g., navigator.serviceWorker.register => navigator.serviceWorker.register
 */
function getMemberExpressionString(node) {
  if (node.type === "MemberExpression") {
    const obj =
      getMemberExpressionString(node.object) ||
      node.object.name ||
      node.object.type;
    const prop =
      node.property.name ||
      (node.computed && node.property.value) ||
      node.property.type ||
      "unknown";
    return `${obj}.${prop}`;
  }
  return node.name || node.type || "unknown";
}

/**
 * Recursively parse a directory of JS files,
 * extract imports, functions, and member expressions,
 * map them to known web features, and check baseline support.
 * Generates a Markdown table for compatibility results.
 *
 * @param {string} dir - Directory to scan
 * @param {boolean} writeHeader - Whether to write the Markdown header (only once)
 */
async function testBabel(dir, writeHeader = true) {
  const results = [];
  const folders = fs.readdirSync(dir);

  // Output file (test.md) where analysis results are appended
  const testPage = path.join(__dirname, "test.md");

  // Only write header once, at the top-level call
  if (writeHeader) {
    try {
      fs.writeFileSync(
        testPage,
        `# Baseline Feature Report\n\n| File | Syntax | Feature ID | Baseline Support |\n|------|--------|------------|-----------------|\n`,
        "utf-8"
      );
    } catch (error) {
      console.error(`Error clearing ${testPage}: ${error.message}`);
    }
  }

  for (const folder of folders) {
    const fullPath = path.join(dir, folder);
    const stat = fs.statSync(fullPath);

    // Recursively process subfolders (except node_modules)
    if (stat.isDirectory()) {
      if (folder !== "node_modules") {
        // Don't write header for subfolders
        results.push(...(await testBabel(fullPath, false)));
      }
      continue;
    }

    // Only parse `.js` files
    if (!path.extname(fullPath).match(/\.js$/)) continue;

    try {
      const source = fs.readFileSync(fullPath, "utf-8");
      // Parse JS into AST
      const ast = parse(source, { sourceType: "unambiguous" });

      // Collect results for this file
      const fileResults = {
        imports: [],
        functions: [],
        members: [],
        mappedFeatures: [], // stores {syntax, featureId}
      };

      // Walk through AST and extract features
      traverse(ast, {
        // --- Handle ES6 imports ---
        ImportDeclaration(path) {
          const importResult = `import: ${path.node.source.value}`;
          fileResults.imports.push(importResult);
        },

        // --- Handle CommonJS require("module") ---
        CallExpression(path) {
          if (
            path.node.callee.name === "require" &&
            path.node.arguments[0]?.type === "StringLiteral"
          ) {
            const importResult = `require: ${path.node.arguments[0].value}`;
            fileResults.imports.push(importResult);
          }

          // --- Expanded: Detect direct function calls and member calls ---
          // e.g., fetch(), Array.prototype.includes(), Promise.all()
          if (path.node.callee.type === "Identifier") {
            const calleeName = path.node.callee.name;
            if (featureMappings[calleeName]) {
              fileResults.mappedFeatures.push({
                syntax: calleeName,
                featureId: featureMappings[calleeName],
              });
            }
          } else if (path.node.callee.type === "MemberExpression") {
            // e.g., Array.prototype.includes, Promise.all, navigator.serviceWorker.register
            const object =
              path.node.callee.object.name ||
              (path.node.callee.object.type === "MemberExpression"
                ? getMemberExpressionString(path.node.callee.object)
                : undefined);
            const property = path.node.callee.property.name;
            // Try both prototype and direct member mapping
            const syntaxProto = object
              ? `${object}.prototype.${property}`
              : undefined;
            const syntaxDirect = object ? `${object}.${property}` : undefined;
            if (syntaxProto && featureMappings[syntaxProto]) {
              fileResults.mappedFeatures.push({
                syntax: syntaxProto,
                featureId: featureMappings[syntaxProto],
              });
            } else if (syntaxDirect && featureMappings[syntaxDirect]) {
              fileResults.mappedFeatures.push({
                syntax: syntaxDirect,
                featureId: featureMappings[syntaxDirect],
              });
            }
          }
        },

        // --- Handle destructured require { x, y } = require("module") ---
        VariableDeclarator(path) {
          if (
            path.node.init?.type === "CallExpression" &&
            path.node.init.callee.name === "require" &&
            path.node.id.type === "ObjectPattern"
          ) {
            const moduleName = path.node.init.arguments[0].value;
            const properties = path.node.id.properties.map(
              (prop) => prop.key.name
            );
            properties.forEach((prop) => {
              const importResult = `require: ${moduleName}.${prop}`;
              fileResults.imports.push(importResult);
            });
          }
        },

        // --- Handle function declarations ---
        FunctionDeclaration(path) {
          const functionResult = `function: ${
            path.node.id?.name || "anonymous"
          }`;
          fileResults.functions.push(functionResult);
        },

        // --- Handle member expressions (e.g., window.fetch, navigator.serviceWorker) ---
        MemberExpression(path) {
          const memberStr = getMemberExpressionString(path.node);
          const memberResult = `member: ${memberStr}`;
          fileResults.members.push(memberResult);

          // Check if this member maps to a known web feature id
          if (featureMappings[memberStr]) {
            fileResults.mappedFeatures.push({
              syntax: memberStr,
              featureId: featureMappings[memberStr],
            });
          }
        },
      });

      // --- Check mapped features against web-features baseline ---
      const mappedWithBaseline = [];
      for (const { syntax, featureId } of fileResults.mappedFeatures) {
        try {
          const baseline = await getWebFeatures(featureId);
          mappedWithBaseline.push({
            syntax,
            featureId,
            baseline: baseline ?? "not found",
          });
        } catch (err) {
          mappedWithBaseline.push({
            syntax,
            featureId,
            baseline: "lookup failed",
          });
        }
      }

      function formatBaseline(baseline) {
        if (baseline === "high") {
          return `✅ **${baseline}** (Widely available)`;
        } else if (baseline === "low") {
          return `⚠️ **${baseline}** (Limited support)`;
        } else if (baseline === false) {
          return `❌ **Discouraged** (Non-baseline)`;
        } else if (baseline === "newly available") {
          return `🆕 **${baseline}** (Recent addition)`;
        } else if (baseline === null || baseline === undefined) {
          return `❓ Not found`;
        }
        return baseline; // Fallback for unknown values
      }

      // --- Write results into test.md as a Markdown table row ---
      if (mappedWithBaseline.length > 0) {
        try {
          const rows = mappedWithBaseline
            .map(
              (item) =>
                `| ${path.basename(fullPath)} | ${item.syntax} | ${
                  item.featureId
                } | ${formatBaseline(item.baseline)} |`
            )
            .join("\n");
          fs.appendFileSync(testPage, rows + "\n", "utf-8");
        } catch (writeError) {
          console.error(`Error writing to ${testPage}: ${writeError.message}`);
        }
      }

      // Push final structured results into memory
      results.push({
        file: fullPath,
        imports: fileResults.imports,
        functions: fileResults.functions,
        members: fileResults.members,
        mappedFeatures: mappedWithBaseline,
      });
    } catch (error) {
      console.error(`Error processing ${fullPath}: ${error.message}`);
    }
  }

  return results;
}

module.exports = testBabel;
