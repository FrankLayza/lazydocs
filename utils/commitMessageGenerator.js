require("dotenv").config();
// utils/commitMessageGenerator.js

// Import VS Code API for showing errors
const vscode = require("vscode");

/**
 * Config: update these constants to switch models
 */
const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_TYPE = "chat"; // "summarization" | "chat"
const SUMMARIZATION_MODEL = "mrm8488/t5-base-finetuned-git-commit-message";
const CHAT_MODEL = "deepseek-ai/DeepSeek-R1:novita";

// === Helper: remove <think> blocks from chat output ===
function extractCommitMessage(content) {
  return content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
}

/**
 * Generate a commit message from a Git diff
 * - If summarization: Hugging Face Inference API
 * - If chat: Chat completion API
 */
async function generateCommitMessage(diff) {
  // Trim large diffs to avoid API errors
  const maxDiffLength = 1000;
  const truncatedDiff =
    diff.length > maxDiffLength ? diff.slice(0, maxDiffLength) + "..." : diff;

  // System prompt (chat models)
  const systemPrompt =
    "You are an assistant that writes concise git commit messages (max 72 chars).";

  try {
    let response, data;

    if (MODEL_TYPE === "summarization") {
      // --- Summarization models (Hugging Face Inference API) ---
      response = await fetch(
        `https://api-inference.huggingface.co/models/${SUMMARIZATION_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: `Generate a concise commit message (max 72 chars) from this diff:\n${truncatedDiff}`,
            parameters: { max_length: 72, min_length: 20 },
          }),
          signal: AbortSignal.timeout(30000), // cancel if >30s
        }
      );

      if (!response.ok) {
        vscode.window.showErrorMessage(
          `Summarization API error: ${response.status}`
        );
        return "Changes detected, please provide a commit message.";
      }

      data = await response.json();
      return (
        data?.[0]?.summary_text ||
        data?.summary_text ||
        "Auto-generated commit message"
      );
    } else {
      // --- Chat models (Novita Chat API) ---
      response = await fetch(
        "https://router.huggingface.co/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: CHAT_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `File changes:\n${truncatedDiff}` },
            ],
            max_tokens: 72,
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!response.ok) {
        vscode.window.showErrorMessage(`Chat API error: ${response.status}`);
        return "Changes detected, please provide a commit message.";
      }

      data = await response.json();
      if (data?.choices?.[0]?.message?.content) {
        const raw = data.choices[0].message.content;
        return extractCommitMessage(raw);
      }
      return "Auto-generated commit message";
    }
  } catch (error) {
    console.error("Commit generation error:", error.message);
    vscode.window.showErrorMessage("API error: " + error.message);
    return "Changes detected, please provide a commit message.";
  }
}

module.exports = { generateCommitMessage };
