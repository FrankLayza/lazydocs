const fs = require("fs");
const path = require("path");

function updateDocs(content, rootPath = process.cwd()) {
  const readmePath = path.join(rootPath, "LAZYDOCS.md");
  let existing = "";

  if (fs.existsSync(readmePath)) {
    existing += fs.readFileSync(readmePath, "utf-8");
  }

  const start = "<!-- LAZYDOCS START -->";
  const end = "<!-- LAZYDOCS END -->";

  if (existing.includes(start) && existing.includes(end)) {
    const updated = existing.replace(
      new RegExp(`${start}[\\s\\S]*${end}`),
      `${start}\n${content}\n${end}`
    );
    fs.writeFileSync(readmePath, updated, "utf-8");
  } else {
    const newContent = existing + `\n${start}\n${content}\n${end}\n`;
    fs.writeFileSync(readmePath, newContent, "utf-8");
  }
}

module.exports = updateDocs;
