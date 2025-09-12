const fs = require("fs");
const path = require("path");

function getTechStack(rootPath = process.cwd()) {
  let output = "## Tech Stack";

  const pkgPath = path.join(rootPath, "package.json");
  const reqPath = path.join(rootPath, "requirements.txt");

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    output += "\n- **Runtime:** Node.js\n";
    if (pkg.dependencies) {
      output +=
        "- **Dependencies:** " + Object.keys(pkg.dependencies).join("\n");
    }
    if (pkg.dependencies) {
      output +=
        "\n- **Dev Tools:** " + Object.keys(pkg.dependencies).join("\n");
    }
  } else if (fs.existsSync(reqPath)) {
    const reqs = fs.readFileSync(reqPath, "utf-8").split("\n").filter(Boolean);
    output += "\n- **Runtime:** Python\n";
    output += "\n- **Dependencies:** " + reqs.join(", ") + "\n";
  } else {
    output += "\nNo package manager files detected.\n";
  }

  return output + "\n";
}

module.exports = getTechStack;
