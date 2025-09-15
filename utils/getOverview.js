require("dotenv").config();
// const HF_API_KEY = process.env.HF_API_KEY;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

// scans project and builds prompt string
function collectProjectContent(rootPath) {
  let projectContents = "";

  function scan(dir) {
    const entries = fs.readdirSync(dir);
    for (const file of entries) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!file.startsWith(".") && file !== "node_modules") scan(fullPath);
      } else {
        const content = fs.readFileSync(fullPath, "utf8");
        const lines = content.split("\n").slice(0, 50);
        const commentPatterns = [/^\s*\/\/|\/\*|#|<!--|"""/];

        if (file.match(/README\.md|package\.json$/i)) {
          projectContents += `\n\nFile: ${file}\n${content.slice(0, 5000)}`;
        } else if (
          path.extname(file).match(/\.(js|ts|jsx|tsx|py|java|c|cpp|html|css)$/)
        ) {
          const comments = lines
            .filter((line) =>
              commentPatterns.some((pattern) => pattern.test(line))
            )
            .join("\n");
          projectContents += `\n\nFile: ${file}\nComments:\n${
            comments || "No comments"
          }\nCode Snippet (first 50 lines):\n${lines.join("\n")}`;
        }
      }
    }
  }

  scan(rootPath);

  if (projectContents.length > 10000) {
    projectContents =
      projectContents.slice(0, 10000) + "\n... (content truncated)";
  }

  console.log("LLM prompt length:", projectContents.length);
  console.log("First 200 chars of prompt:\n", projectContents.slice(0, 200));

  return projectContents;
}

// call HF LLM API
async function generateOverviewByLLM(projectContents) {
  // Call backend API instead of Hugging Face directly
  const response = await fetch("http://localhost:4500/api/v1/summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: projectContents }),
  });
  if (!response.ok)
    throw new Error(`Backend API error: ${response.statusText}`);
  const data = await response.json();
  // Expect { summary } in response
  return extractSingleParagraph(data?.summary || "");
}

function extractSingleParagraph(text) {
  const noThink = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const paragraphs = noThink.split(/\n\s*\n/).filter((p) => p.trim());
  return paragraphs.length > 0
    ? paragraphs[0].trim()
    : "No valid overview generated. The project may lack sufficient details.";
}

// main exported function
async function extraOverview(rootPath) {
  const projectContents = collectProjectContent(rootPath);

  // show spinner while LLM is working
  const overviewText = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "*Burrrp* Generating docs… this might get schwifty.",
    },
    async () => {
      return await generateOverviewByLLM(projectContents);
    }
  );

  vscode.window.showInformationMessage(
    "Docs portal complete. Now even Birdperson can understand your project."
  );
  return overviewText;
}

module.exports = extraOverview;
