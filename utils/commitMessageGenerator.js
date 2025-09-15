require("dotenv").config();
const vscode = require("vscode");

function extractCommitMessage(content) {
  return content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
}

const URL = "https://lazydocs.vercel.app/api/v1/commit";

async function generateCommitMessageWithProgress(message) {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Getting Schwifty With This Commit",
      cancellable: false, // set to true if you want the user to cancel
    },
    async (progress) => {
      progress.report({ message: "Sending your diff to the backend..." });

      try {
        const res = await fetch(URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ diff: message }),
        });

        if (!res.ok) {
          throw new Error(`Backend API error: ${res.statusText}`);
        }

        const data = await res.json();

        progress.report({ message: "Processing response..." });
        await new Promise((r) => setTimeout(r, 500)); // optional small delay for UX

        const commitMsg = extractCommitMessage(data?.result || data);
        vscode.window.showInformationMessage(
          `Commit message generated: "${commitMsg}"`
        );

        return commitMsg;
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to generate commit message: ${error.message}`
        );
        throw error;
      }
    }
  );
}

module.exports = { generateCommitMessageWithProgress };
