const fs = require("fs");
const path = require("path");

function getTechStack(rootPath = process.cwd()) {
  let output = "## Tech Stack";

  const pkgPath = path.join(rootPath, "package.json");
  const reqPath = path.join(rootPath, "requirements.txt");

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    output += "- **Runtime:** Node.js\n";
    if (pkg.dependencies) {
      output +=
        "- **Dependencies:** " +
        Object.keys(pkg.dependencies).join(", ") +
        "\n";
    }
    if (pkg.dependencies) {
      output +=
        "- **Dev Tools:** " + Object.keys(pkg.dependencies).join(", ") + "\n";
    }
  } else if (fs.existsSync(reqPath)) {
    const reqs = fs.readFileSync(reqPath, "utf-8").split("\n").filter(Boolean);
    output += "- **Runtime:** Python\n";
    output += "- **Dependencies:** " + reqs.join(", ") + "\n";
  } else {
    output += "No package manager files detected.\n";
  }

  return output + "\n";
}

module.exports = getTechStack;
