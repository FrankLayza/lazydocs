const fs = require("fs");
const path = require("path");
const generate = require("@babel/generator");
const t = require("@babel/types");
const { parse } = require("@babel/parser");
const  traverse  = require("@babel/traverse").default;

export default function testBabel(dir) {
  const folders = fs.readdirSync(dir);
  for (const folder of folders) {
    const fullPath = path.join(dir, folder);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (folder !== "node_modules") {
        testBabel(fullPath);
      }
    } else {
      if (path.extname(fullPath).match(/\.js$/)) {
        const source = fs.readFileSync(fullPath, "utf-8");
        const ast = parse(source, {
          sourceType: "unambiguous",
        });

        traverse(ast, {
          enter(path) {
            console.log(path.node.type);
          },
        });
      }
    }
  }
}
