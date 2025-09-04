const fs = require("fs")
const path = require("path")

function getTitle(rootPath = process.cwd()) {
  const packagePath = path.join(rootPath, "package.json");
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
      return pkg.name || path.basename(rootPath);
    } catch {
      return path.basename(rootPath);
    }
  }
  return path.basename(rootPath);
}

module.exports = getTitle