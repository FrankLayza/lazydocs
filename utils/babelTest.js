const fs = require("fs").promises;
const path = require("path");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { getWebFeatures } = require("./getWebFeature");
const { featureMappings } = require("./data/featureMappings");

/**
 * Recursively build member expression string (e.g., navigator.serviceWorker.register)
 * @param {Object} node - AST node
 * @returns {string} Member expression string
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
 * Recursively parse a directory of JS files, extract all JS syntax,
 * map to web-features, and check baseline support.
 * Generates a Markdown table for compatibility results.
 *
 * @param {string} dir - Directory to scan
 * @param {Object} [options] - Options: { writeHeader: boolean, extensions: string[] }
 * @returns {Promise<Object[]>} Array of file results
 */
async function testBabel(
  dir,
  options = { writeHeader: true, extensions: [".js", ".jsx", ".mjs"] }
) {
  const { writeHeader, extensions } = options;
  const results = [];
  const testPage = path.join(__dirname, `test-${Date.now()}.md`); // Unique output file

  // Write header if top-level call
  if (writeHeader) {
    try {
      await fs.writeFile(
        testPage,
        `# Baseline Feature Report\n\n| File | Syntax | Feature ID | Baseline Support | Line |\n|------|--------|------------|------------------|------|\n`,
        "utf-8"
      );
    } catch (error) {
      console.error(`Error initializing ${testPage}: ${error.message}`);
    }
  }

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    console.error(`Error reading directory ${dir}: ${error.message}`);
    return results;
  }

  // Process files and subdirectories in parallel
  const tasks = entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);

    // Skip hidden files and node_modules
    if (entry.name.startsWith(".") || entry.name === "node_modules") return [];

    if (entry.isDirectory()) {
      return testBabel(fullPath, { ...options, writeHeader: false });
    }

    if (!extensions.includes(path.extname(fullPath).toLowerCase())) return [];

    try {
      const source = await fs.readFile(fullPath, "utf-8");
      const ast = parse(source, {
        sourceType: "unambiguous",
        plugins: ["jsx"], // Support .jsx files
      });

      const fileResults = {
        imports: new Set(),
        functions: new Set(),
        members: new Set(),
        mappedFeatures: new Set(),
      };

      // Traverse AST to extract all JS syntax
      traverse(ast, {
        ImportDeclaration(path) {
          fileResults.imports.add(`import: ${path.node.source.value}`);
        },

        CallExpression(path) {
          if (
            path.node.callee.name === "require" &&
            path.node.arguments[0]?.type === "StringLiteral"
          ) {
            fileResults.imports.add(`require: ${path.node.arguments[0].value}`);
          }

          if (path.node.callee.type === "Identifier") {
            const calleeName = path.node.callee.name;
            if (featureMappings[calleeName]) {
              fileResults.mappedFeatures.add({
                syntax: calleeName,
                featureId: featureMappings[calleeName],
                line: path.node.loc.start.line,
              });
            }
          } else if (path.node.callee.type === "MemberExpression") {
            const object =
              path.node.callee.object.name ||
              getMemberExpressionString(path.node.callee.object);
            const property = path.node.callee.property.name;
            const syntaxProto = object
              ? `${object}.prototype.${property}`
              : undefined;
            const syntaxDirect = object ? `${object}.${property}` : undefined;
            if (syntaxProto && featureMappings[syntaxProto]) {
              fileResults.mappedFeatures.add({
                syntax: syntaxProto,
                featureId: featureMappings[syntaxProto],
                line: path.node.loc.start.line,
              });
            } else if (syntaxDirect && featureMappings[syntaxDirect]) {
              fileResults.mappedFeatures.add({
                syntax: syntaxDirect,
                featureId: featureMappings[syntaxDirect],
                line: path.node.loc.start.line,
              });
            }
          }
        },

        VariableDeclarator(path) {
          if (
            path.node.init?.type === "CallExpression" &&
            path.node.init.callee.name === "require" &&
            path.node.id.type === "ObjectPattern"
          ) {
            const moduleName = path.node.init.arguments[0].value;
            path.node.id.properties.forEach((prop) => {
              fileResults.imports.add(
                `require: ${moduleName}.${prop.key.name}`
              );
            });
          }
        },

        FunctionDeclaration(path) {
          fileResults.functions.add(
            `function: ${path.node.id?.name || "anonymous"}`
          );
          if (path.node.async && featureMappings["FunctionDeclaration:async"]) {
            fileResults.mappedFeatures.add({
              syntax: "async function declaration",
              featureId: featureMappings["FunctionDeclaration:async"],
              line: path.node.loc.start.line,
            });
          }
          if (
            path.node.generator &&
            featureMappings["FunctionDeclaration:generator"]
          ) {
            fileResults.mappedFeatures.add({
              syntax: "generator function declaration",
              featureId: featureMappings["FunctionDeclaration:generator"],
              line: path.node.loc.start.line,
            });
          }
        },

        FunctionExpression(path) {
          if (path.node.async && featureMappings["FunctionExpression:async"]) {
            fileResults.mappedFeatures.add({
              syntax: "async function expression",
              featureId: featureMappings["FunctionExpression:async"],
              line: path.node.loc.start.line,
            });
          }
          if (
            path.node.generator &&
            featureMappings["FunctionExpression:generator"]
          ) {
            fileResults.mappedFeatures.add({
              syntax: "generator function expression",
              featureId: featureMappings["FunctionExpression:generator"],
              line: path.node.loc.start.line,
            });
          }
        },

        ArrowFunctionExpression(path) {
          if (featureMappings["ArrowFunctionExpression"]) {
            fileResults.mappedFeatures.add({
              syntax: "arrow functions",
              featureId: featureMappings["ArrowFunctionExpression"],
              line: path.node.loc.start.line,
            });
          }
        },

        ClassDeclaration(path) {
          if (featureMappings["ClassDeclaration"]) {
            fileResults.mappedFeatures.add({
              syntax: "class declaration",
              featureId: featureMappings["ClassDeclaration"],
              line: path.node.loc.start.line,
            });
          }
        },

        ClassExpression(path) {
          if (featureMappings["ClassExpression"]) {
            fileResults.mappedFeatures.add({
              syntax: "class expression",
              featureId: featureMappings["ClassExpression"],
              line: path.node.loc.start.line,
            });
          }
        },

        AwaitExpression(path) {
          if (featureMappings["AwaitExpression"]) {
            fileResults.mappedFeatures.add({
              syntax: "await expression",
              featureId: featureMappings["AwaitExpression"],
              line: path.node.loc.start.line,
            });
          }
        },

        BigIntLiteral(path) {
          if (featureMappings["BigIntLiteral"]) {
            fileResults.mappedFeatures.add({
              syntax: "BigInt literal",
              featureId: featureMappings["BigIntLiteral"],
              line: path.node.loc.start.line,
            });
          }
        },

        ObjectPattern(path) {
          if (featureMappings["ObjectPattern"]) {
            fileResults.mappedFeatures.add({
              syntax: "object destructuring",
              featureId: featureMappings["ObjectPattern"],
              line: path.node.loc.start.line,
            });
          }
        },

        ArrayPattern(path) {
          if (featureMappings["ArrayPattern"]) {
            fileResults.mappedFeatures.add({
              syntax: "array destructuring",
              featureId: featureMappings["ArrayPattern"],
              line: path.node.loc.start.line,
            });
          }
        },

        YieldExpression(path) {
          if (featureMappings["YieldExpression"]) {
            fileResults.mappedFeatures.add({
              syntax: "yield expression",
              featureId: featureMappings["YieldExpression"],
              line: path.node.loc.start.line,
            });
          }
        },

        ForOfStatement(path) {
          if (featureMappings["ForOfStatement"]) {
            fileResults.mappedFeatures.add({
              syntax: "for...of loop",
              featureId: featureMappings["ForOfStatement"],
              line: path.node.loc.start.line,
            });
          }
        },

        // ForAwaitOfStatement(path) {
        //   if (featureMappings["ForAwaitOfStatement"]) {
        //     fileResults.mappedFeatures.add({
        //       syntax: "for await...of loop",
        //       featureId: featureMappings["ForAwaitOfStatement"],
        //       line: path.node.loc.start.line,
        //     });
        //   }
        // },

        SpreadElement(path) {
          if (featureMappings["SpreadElement"]) {
            fileResults.mappedFeatures.add({
              syntax: "spread operator",
              featureId: featureMappings["SpreadElement"],
              line: path.node.loc.start.line,
            });
          }
        },

        TemplateLiteral(path) {
          if (featureMappings["TemplateLiteral"]) {
            fileResults.mappedFeatures.add({
              syntax: "template literals",
              featureId: featureMappings["TemplateLiteral"],
              line: path.node.loc.start.line,
            });
          }
        },

        // ChainExpression(path) {
        //   if (featureMappings["ChainExpression"]) {
        //     fileResults.mappedFeatures.add({
        //       syntax: "optional chaining",
        //       featureId: featureMappings["ChainExpression"],
        //       line: path.node.loc.start.line,
        //     });
        //   }
        // },

        LogicalExpression(path) {
          if (
            path.node.operator === "??" &&
            featureMappings["LogicalExpression:??"]
          ) {
            fileResults.mappedFeatures.add({
              syntax: "nullish coalescing",
              featureId: featureMappings["LogicalExpression:??"],
              line: path.node.loc.start.line,
            });
          }
        },

        BinaryExpression(path) {
          if (
            path.node.operator === "**" &&
            featureMappings["BinaryExpression:**"]
          ) {
            fileResults.mappedFeatures.add({
              syntax: "exponentiation operator",
              featureId: featureMappings["BinaryExpression:**"],
              line: path.node.loc.start.line,
            });
          }
        },

        MemberExpression(path) {
          const memberStr = getMemberExpressionString(path.node);
          fileResults.members.add(`member: ${memberStr}`);
          if (featureMappings[memberStr]) {
            fileResults.mappedFeatures.add({
              syntax: memberStr,
              featureId: featureMappings[memberStr],
              line: path.node.loc.start.line,
            });
          }
        },
      });

      // Check baseline support
      const mappedWithBaseline = [];
      for (const feature of fileResults.mappedFeatures) {
        try {
          const baseline = await getWebFeatures(feature.featureId);
          mappedWithBaseline.push({
            ...feature,
            baseline: baseline ?? "not found",
          });
        } catch (err) {
          console.warn(
            `Baseline lookup failed for ${feature.featureId}: ${err.message}`
          );
          mappedWithBaseline.push({
            ...feature,
            baseline: "lookup failed",
          });
        }
      }

      // Format baseline for Markdown
      function formatBaseline(baseline) {
        if (baseline === "high") return `✅ **${baseline}** (Widely available)`;
        if (baseline === "low") return `⚠️ **${baseline}** (Limited support)`;
        if (baseline === false) return `❌ **${baseline}** (Non-baseline)`;
        if (baseline === "newly available")
          return `🆕 **${baseline}** (Recent addition)`;
        if (baseline === null || baseline === undefined) return `❓ Not found`;
        return `❓ ${baseline}`;
      }

      // Write to test.md
      if (mappedWithBaseline.length > 0) {
        try {
          const rows = mappedWithBaseline
            .map(
              (item) =>
                `| ${path.basename(fullPath)} | ${item.syntax} | ${
                  item.featureId
                } | ${formatBaseline(item.baseline)} | ${item.line} |`
            )
            .join("\n");
          await fs.appendFile(testPage, rows + "\n", "utf-8");
        } catch (writeError) {
          console.error(`Error writing to ${testPage}: ${writeError.message}`);
        }
      }

      // Summarize file results
      const summary = `File: ${path.basename(fullPath)}\nDetected ${
        mappedWithBaseline.length
      } features: ${
        mappedWithBaseline.filter((f) => f.baseline === "high").length
      } high, ${
        mappedWithBaseline.filter(
          (f) => f.baseline === "low" || f.baseline === "newly available"
        ).length
      } low/newly available, ${
        mappedWithBaseline.filter((f) => f.baseline === false).length
      } non-baseline`;
      console.log(summary);

      return [
        {
          file: fullPath,
          imports: [...fileResults.imports],
          functions: [...fileResults.functions],
          members: [...fileResults.members],
          mappedFeatures: mappedWithBaseline,
        },
      ];
    } catch (error) {
      console.error(`Error processing ${fullPath}: ${error.message}`);
      return [];
    }
  });

  // Run tasks in parallel
  const nestedResults = await Promise.all(tasks);
  return results.concat(...nestedResults);
}

module.exports = testBabel;
