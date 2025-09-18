const fs = require("fs");
const path = require("path");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { getWebFeatures } = require("./getWebFeature");

async function testBabel(dir) {
  const results = [];
  const folders = fs.readdirSync(dir);

  // Clear test.md at the start
  const testPage = path.join(dir, "test.md");
  try {
    fs.writeFileSync(testPage, "", "utf-8");
  } catch (error) {
    console.error(`Error clearing ${testPage}: ${error.message}`);
  }

  for (const folder of folders) {
    const fullPath = path.join(dir, folder);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (folder !== "node_modules") {
        results.push(...testBabel(fullPath));
      }
    } else if (path.extname(fullPath).match(/\.js$/)) {
      try {
        const source = fs.readFileSync(fullPath, "utf-8");
        const ast = parse(source, { sourceType: "unambiguous" });
        const fileResults = {
          imports: [],
          functions: [],
          members: [],
        };

        traverse(ast, {
          ImportDeclaration(path) {
            const importResult = `import: ${path.node.source.value}`;
            fileResults.imports.push(importResult);
            console.log(importResult);
          },
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
          FunctionDeclaration(path) {
            const functionResult = `function: ${
              path.node.id?.name || "anonymous"
            }`;
            fileResults.functions.push(functionResult);
            console.log(functionResult);
          },
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
            const memberResult = `member: ${getMemberExpressionString(
              path.node
            )}`;
            fileResults.members.push(memberResult);
            console.log(memberResult);
          },
        });

        for (const id of fileResults.functions) {
          const baseline = await getWebFeatures(id);
          console.log(id, baseline);
          results.push({ id, baseline });
        }

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
              "", // Extra newline
            ].join("\n");

            fs.appendFileSync(testPage, markdownContent, "utf-8");
            results.push({
              file: fullPath,
              testPage,
              imports: fileResults.imports,
              functions: fileResults.functions,
              members: fileResults.members,
            });
          } catch (writeError) {
            console.error(
              `Error writing to ${testPage}: ${writeError.message}`
            );
          }
        }
      } catch (error) {
        console.error(`Error processing ${fullPath}: ${error.message}`);
      }
    }
  }

  return results;
}

module.exports = testBabel;
