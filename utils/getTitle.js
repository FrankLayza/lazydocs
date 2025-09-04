const fs = require("fs");
const path = require("path");

function getTitle(rootPath = process.cwd()) {
  const packagePath = path.join(rootPath, "package.json");
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
      return `Project Title ${pkg.name || path.basename(rootPath)}`;
    } catch {
      return `Project Title ${path.basename(rootPath)}`;
    }
  }
  return `Project Title ${path.basename(rootPath)}`;
}

module.exports = getTitle;
