const fs = require("fs");
const path = require("path");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;

module.exports = function testBabel(dir) {
  const results = []; // Store results for debugging
  const folders = fs.readdirSync(dir);

  for (const folder of folders) {
    const fullPath = path.join(dir, folder);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules
      if (folder !== "node_modules") {
        results.push(...testBabel(fullPath)); // Recursive call, collect results
      }
    } else if (path.extname(fullPath).match(/\.js$/)) {
      try {
        // Read .js file
        const source = fs.readFileSync(fullPath, "utf-8");
        // Parse with unambiguous module type
        const ast = parse(source, { sourceType: "unambiguous" });

        // Define test.md in the same directory as the .js file
        const testPage = path.join(path.dirname(fullPath), "test.md");
        const fullResults = {
          functions: [],
          imports: [],
          members: [],
        }; 

        traverse(ast, {
          ImportDeclaration(path) {
            fullResults.imports.push(path.node.source.value);
            console.log(`import: ${path.node.source.value}`);
          },
          FunctionDeclaration(path) {
            fullResults.functions.push(path.node.id.name);
            console.log(`function: ${path.node.id.name}`);
          },
          MemberExpression(path) {
            const obj = path.node.object.name || "unknown";
            const prop = path.node.property.name || "unknown";
            const result = `member: ${obj}.${prop}`;
            fullResults.members.push(result); // Collect for writing
          },
          CallExpression(path){
            if(path.node.callee.name == "require" && path.node.arguments[0]?.type == "StringLiteral"){
              const importResult = `require: ${path.node.arguments[0]?.value}`
              fullResults.imports.push(importResult)
            }
          }
        });

        if (
          fullResults.functions.length > 0 ||
          fullResults.imports.length > 0 ||
          fullResults.members.length > 0
        ) {
          try {
            const markdownContent = [
              `# Analysis of ${path.basename(fullPath)}`,
              "## Imports",
              fullResults.imports.length > 0
                ? fullResults.imports.join("\n")
                : "None",
              "## Functions",
              fullResults.functions.length > 0
                ? fullResults.functions.join("\n")
                : "None",
              "## Member Expressions",
              fullResults.members.length > 0
                ? fullResults.members.join("\n")
                : "None",
              "", // Extra newline for readability
            ].join("\n");
            fs.appendFileSync(testPage, markdownContent, "utf-8");
            results.push({
              file: fullPath,
              testPage,
              members: fullResults.members,
              function: fullResults.functions,
              import: fullResults.imports,
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

  return results; // Return results for debugging
};
