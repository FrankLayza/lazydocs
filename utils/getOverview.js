const fs = require("fs");
const path = require("path");
const axios = require("axios")

//an extractcomment function that retrieves comments from the first 10 lines
function extractComments(rootPath) {
  const content = fs.readFileSync(rootPath, "utf-8");
  const lines = content.split("\n");

  //a simple regex for getting top comments in files
  const comments = lines
    .slice(0, 10)
    .filter(
      (line) =>
        line.trim().startsWith("//") ||
        line.trim().startsWith("#") ||
        line.trim().startsWith("/*")
    );

  return comments.map((c) =>
    c.replace(/^(\s*\/\/|\s*#|\s*\/\*|\*\/)/, "").trim()
  );
}

//the getOverview function
function getOverview(rootPath = process.cwd()) {
  const srcPath = path.join(rootPath, "src");
  let notes = [];

  if (fs.existsSync(srcPath)) {
    const files = fs.readdirSync(srcPath);
    for (const file of files) {
      const filePath = path.join(srcPath, file);
      if (fs.lstatSync(filePath).isFile()) {
        const comments = extractComments(filePath);
        if (comments.length) {
          notes.push(`**${file}** → ${comments.join(" ")}`);
        } else {
          notes.push(`**${file}** → Module`);
        }
      }
    }
  }

  if (notes.length === 0) {
    return "## Overview\nNo top-level comments found. Modules are documented by filenames.\n";
  }

  return `## Overview\n${notes.map((n) => "- " + n).join("\n")}\n`;
}

async function extraOverview(rootPath){
  let hasComments = false
  let projectContents = ''

  function scanProjectDirectory(dir){
    const projectFiles = fs.readdirSync(dir)
    for(const file of projectFiles){
      const fullPath = path.join(dir, file)
      const fullPathStats = fs.statSync(fullPath)
      if(fullPathStats.isDirectory()){
        if(!file.startsWith(".") && file !== "node_modules"){
          scanProjectDirectory(fullPath)
        }
      }else{
        const content = fs.readFileSync(fullPath, "utf-8")
        const contentLines = content.split("\n").slice(0, 10)
        const commentPatterns = [/^\s*\/\/|\/\*|#|<!--|"""/]
        if(contentLines.some(line => commentPatterns.some(pattern => pattern.test(line)))){
          hasComments = true
        }
        if(path.extname(file).match(/\.(js|ts|jsx|tsx|py|java|c|cpp)$/)){
          projectContents += `\n\nFile: ${file}\n${content}`
        }
      }
    }
  }
  scanProjectDirectory(rootPath)

  if(hasComments){
    return `This project has some cool comments`
  }
  else{

  }
}



module.exports = getOverview;
