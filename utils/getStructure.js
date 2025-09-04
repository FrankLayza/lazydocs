const fs = require("fs");
const path = require("path");

function buildTree(dir, prefix = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let tree = "";

  entries.forEach((entry, i) => {
    const connector = i === entries.length - 1 ? "└── " : "├── ";
    tree += prefix + connector + entry.name + "\n";
    if (entry.isDirectory()) {
      tree += buildTree(
        path.join(dir, entry.name),
        prefix + (i === entries.length - 1 ? "    " : "│   ")
      );
    }
  });

  return tree;
}

function getStructure(rootPath = process.cwd()) {
    const srcPath = path.join(rootPath, "src")
    if(!fs.existsSync(srcPath)) return "## Project Structure\nNo src directory found.\n";

    return `## Project Structure\n\`\`\`\n${buildTree(srcPath)}\`\`\`\n`;
}

module.exports = getStructure;