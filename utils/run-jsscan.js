const path = require("path");
const fs = require("fs");
const { scanJsFolder } = require("./jsScanner");

(async function run() {
  try {
    const root = path.resolve(process.cwd());
    console.log("Scanning:", root);
    const results = await scanJsFolder(root);
    const outPath = path.join(__dirname, "jsscan-results.json");
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
    console.log("Results written to", outPath);
  } catch (err) {
    console.error("Run error:", err.message);
    process.exitCode = 1;
  }
})();
