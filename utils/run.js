const path = require("path");
const testBabel = require("./babelTest");

(async () => {
  const targetDir = path.join(__dirname, "../utils");
  const results = await testBabel(targetDir);

  console.log("Analysis complete");
  console.log(results);
})();
