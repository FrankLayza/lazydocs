// Import VS Code API for workspace, UI, and Git interactions
const vscode = require("vscode");
// Import execSync to run Git commands (used for staged diffs)
const { execSync } = require("child_process");
// Import path for cross-platform file handling
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// if (!process.env.HF_API_KEY) {
//   vscode.window.showWarningMessage(
//     "HF_API_KEY is missing. Commit generation will fail."
//   );
// }

// Import utilities for documentation generation
const getTitle = require("./utils/getTitle");
const extraOverview = require("./utils/getOverview");
const getBoilerPlate = require("./utils/getBoilerPlate");
const getTechStack = require("./utils/getTechStack");
const getStructure = require("./utils/getStructure");
const updateDocs = require("./utils/updateDocs");

// Import utility for commit message generation (calls Hugging Face API)
const {
  generateCommitMessageWithProgress,
} = require("./utils/commitMessageGenerator");

// Import LLM-based README generator
// const generateReadme = require("./utils/generateReadme");

// Activates the extension when VS Code starts
function activate(context) {
  console.log(
    "Wubba Lubba Dub Docs! LAZYDOCS just activated across the multiverse."
  ); // Log activation

  /**
   * Command: Generate project documentation
   * Combines title, overview, tech stack, boilerplate, and structure
   * into a markdown file (LAZYDOCS.md).
   */
  const disposableDocs = vscode.commands.registerCommand(
    "lazydocs.generateDocs",
    async () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders) {
        vscode.window.showErrorMessage("No workspace folder open.");
        return;
      }
      const rootPath = folders[0].uri.fsPath;

      // 1. Generate raw doc sections (from utils)
      const title = await getTitle(rootPath);
      const overview = await extraOverview(rootPath);
      const structure = await getStructure(rootPath);
      const boilerPlate = await getBoilerPlate();
      const techStack = await getTechStack(rootPath);

      const rawContent = `# ${title}\n\n${overview}\n\n${techStack}\n\n${boilerPlate}\n\n${structure}`;

      // 2. Call LLM to finesse into README-style docs
      // const finalContent = await generateReadme(rawContent);

      // 3. Write to LAZYDOCS.md instead of README.md
      updateDocs(rawContent, rootPath);
    }
  );

  /**
   * Command: Auto-generate commit message
   * - Collects staged changes via Git
   * - Builds diffs for each file
   * - Sends diff to Hugging Face API
   * - Inserts AI-generated commit message into Git input box
   */
  const disposableCommit = vscode.commands.registerCommand(
    "lazydocs.autoGenerateCommit",
    async () => {
      try {
        // Access VS Code Git extension API
        const gitExtension =
          vscode.extensions.getExtension("vscode.git")?.exports;
        if (!gitExtension) {
          vscode.window.showErrorMessage("Git extension not found.");
          return;
        }
        const git = gitExtension.getAPI(1);
        const repository = git.repositories[0];
        if (!repository) {
          vscode.window.showErrorMessage("No Git repository found.");
          return;
        }

        // Check for staged changes before proceeding
        const stagedChanges = repository.state.indexChanges;
        if (!stagedChanges.length) {
          vscode.window.showInformationMessage(
            "No staged changes found. Stage files with 'git add'."
          );
          return;
        }

        // Gather diffs for all staged files
        let diffOutput = "";
        const rootPath = repository.rootUri.fsPath;
        for (const change of stagedChanges) {
          const filePath = change.uri.fsPath;
          const relativePath = path.relative(rootPath, filePath);

          // Run `git diff --cached` for staged changes
          const diff = execSync(`git diff --cached "${relativePath}"`, {
            cwd: rootPath,
            encoding: "utf8",
          });

          // Append per-file diff with label
          diffOutput += `File: ${relativePath}\n${diff}\n`;
        }

        // Call Hugging Face API to generate commit message
        const commitMessage = await generateCommitMessageWithProgress(
          diffOutput
        );

        // Insert generated commit message into Git commit box
        repository.inputBox.value = commitMessage;
        vscode.window.showInformationMessage("Commit message generated!");
      } catch (error) {
        // Catch unexpected errors and display to user
        vscode.window.showErrorMessage("Error: " + error.message);
      }
    }
  );

  // Register extension commands
  context.subscriptions.push(disposableDocs, disposableCommit);
}

// Deactivates the extension
function deactivate() {}

module.exports = { activate, deactivate };
