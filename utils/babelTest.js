const fs = require("fs");
const path = require("path");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { getWebFeatures } = require("./getWebFeature");
const { featureMappings } = require("./data/featureMappings");

/**
 * Recursively parse a directory of JS files,
 * extract imports, functions, and member expressions,
 * map them to known web features, and check baseline support.
 */
async function testBabel(dir) {
  const results = [];
  const folders = fs.readdirSync(dir);

  // Output file (test.md) where analysis results are appended
  const testPage = path.join(dir, "test.md");

  // Clear output file at the beginning
  try {
    fs.writeFileSync(testPage, "", "utf-8");
  } catch (error) {
    console.error(`Error clearing ${testPage}: ${error.message}`);
  }

  for (const folder of folders) {
    const fullPath = path.join(dir, folder);
    const stat = fs.statSync(fullPath);

    // Recursively process subfolders (except node_modules)
    if (stat.isDirectory()) {
      if (folder !== "node_modules") {
        results.push(...(await testBabel(fullPath)));
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
        mappedFeatures: [], // stores mapped features
      };

      // Walk through AST and extract features
      traverse(ast, {
        // --- Handle ES6 imports ---
        ImportDeclaration(path) {
          const importResult = `import: ${path.node.source.value}`;
          fileResults.imports.push(importResult);
          console.log(importResult);
        },

        // --- Handle CommonJS require("module") ---
        CallExpression(path) {
          if (
            path.node.callee.name === "require" &&
            path.node.arguments[0]?.type === "StringLiteral"
          ) {
            const importResult = `require: ${path.node.arguments[0].value}`;
            fileResults.imports.push(importResult);
            console.log(importResult);
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
              console.log(importResult);
            });
          }
        },

        // --- Handle function declarations ---
        FunctionDeclaration(path) {
          const functionResult = `function: ${
            path.node.id?.name || "anonymous"
          }`;
          fileResults.functions.push(functionResult);
          console.log(functionResult);
        },

        // --- Handle member expressions (e.g., window.fetch, navigator.serviceWorker) ---
        MemberExpression(path) {
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

          const memberStr = getMemberExpressionString(path.node);
          const memberResult = `member: ${memberStr}`;
          fileResults.members.push(memberResult);
          console.log(memberResult);

          // Check if this member maps to a known web feature
          if (featureMappings[memberStr]) {
            fileResults.mappedFeatures.push(featureMappings[memberStr]);
          }
        },
      });

      // --- Check mapped features against web-features baseline ---
      for (const feature of fileResults.mappedFeatures) {
        const baseline = await getWebFeatures(feature);
        console.log(`Feature: ${feature} → Baseline: ${baseline}`);
        results.push({ feature, baseline });
      }

      // --- Write results into test.md if anything was found ---
      if (
        fileResults.imports.length > 0 ||
        fileResults.functions.length > 0 ||
        fileResults.members.length > 0
      ) {
        try {
          const markdownContent = [
            `# Analysis of ${path.basename(fullPath)}`,
            "## Imports",
            fileResults.imports.length > 0
              ? fileResults.imports.join("\n")
              : "None",
            "## Functions",
            fileResults.functions.length > 0
              ? fileResults.functions.join("\n")
              : "None",
            "## Member Expressions",
            fileResults.members.length > 0
              ? fileResults.members.join("\n")
              : "None",
            "## Mapped Web Features",
            fileResults.mappedFeatures.length > 0
              ? fileResults.mappedFeatures.join("\n")
              : "None",
            "", // Extra newline
          ].join("\n");

          fs.appendFileSync(testPage, markdownContent, "utf-8");

          // Push final structured results
          results.push({
            file: fullPath,
            testPage,
            imports: fileResults.imports,
            functions: fileResults.functions,
            members: fileResults.members,
            mappedFeatures: fileResults.mappedFeatures,
          });
        } catch (writeError) {
          console.error(`Error writing to ${testPage}: ${writeError.message}`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${fullPath}: ${error.message}`);
    }
  }

  return results;
}

module.exports = testBabel;
