const fs = require("fs");
const path = require("path");
const axios = require("axios");

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

async function extraOverview(rootPath) {
  let hasComments = false;
  let projectContents = "";

  function scanProjectDirectory(dir) {
    const projectFiles = fs.readdirSync(dir);
    for (const file of projectFiles) {
      const fullPath = path.join(dir, file);
      const fullPathStats = fs.statSync(fullPath);
      if (fullPathStats.isDirectory()) {
        if (!file.startsWith(".") && file !== "node_modules") {
          scanProjectDirectory(fullPath);
        }
      } else {
        const content = fs.readFileSync(fullPath, "utf-8");
        const contentLines = content.split("\n").slice(0, 50);
        const commentPatterns = [/^\s*\/\/|\/\*|#|<!--|"""/];
        if (
          contentLines.some((line) =>
            commentPatterns.some((pattern) => pattern.test(line))
          )
        ) {
          hasComments = true;
        }
        if (file.match(/README\.md|package\.json$/i)) {
          // Include full README and package.json (cap at 5000 chars)
          projectContents += `\n\nFile: ${file}\n${content.slice(0, 5000)}`;
        } else if (
          path.extname(file).match(/\.(js|ts|jsx|tsx|py|java|c|cpp)$/)
        ) {
          // Collect comments and limited code for key files
          const comments = contentLines
            .filter((line) =>
              commentPatterns.some((pattern) => pattern.test(line))
            )
            .join("\n");
          projectContents += `\n\nFile: ${file}\nComments:\n${
            comments || "No comments"
          }\nCode Snippet (first 50 lines):\n${contentLines.join("\n")}`;
        }
      }
    }
  }
  scanProjectDirectory(rootPath);
  if (projectContents.length > 10000) {
    projectContents =
      projectContents.slice(0, 10000) + "\n... (content truncated)";
  }

  if (hasComments) {
    return `This project has some cool comments`;
  } else {
    return await generateOverviewByLLM(projectContents);
  }
}

async function generateOverviewByLLM(content) {
  const prompt = `You are a code analysis expert. Below is a sampled representation of a software project, including file names, comments (if any), and snippets from key files (e.g., README, package.json, or code files). Generate a concise summary (150–300 words) of the project's purpose, key components, and technologies used. Focus on the main functionality, structure, and tech stack, avoiding unnecessary details. If the content is limited, make an educated guess based on file names and snippets.

Sampled Project Content:
${content}

Summary:`;

try {
  
} catch (error) {
  
}
}

module.exports = getOverview;
