require("dotenv").config();
const HF_API_KEY = process.env.HF_API_KEY;
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
  const prompt = `
Based on the following directory structure:
${projectContents}

Generate a single paragraph (100-150 words) summarizing the project's purpose, 
key technologies, and main features. 
Return only the summary paragraph, without any analysis, 
thought process, or tags like <think>. Do not include extra text or headings.
`;

  const response = await fetch(
    "https://router.huggingface.co/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-R1:novita",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      }),
    }
  );
  if (!HF_API_KEY)
    throw new Error(`Morty! We can’t do AI stuff without the API key, Morty!`);
  if (!response.ok) throw new Error(`HF API error: ${response.statusText}`);
  const data = await response.json();
  const raw = data.choices[0].message.content.trim();
  return extractSingleParagraph(raw);
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
