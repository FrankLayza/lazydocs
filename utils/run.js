const testBabel = require("./babelTest")

// updated the code to an asynchronous function
(async () => {
  const results = await testBabel("../utils");
  console.log(results);
})();