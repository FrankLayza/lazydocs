const fs = require("fs");
require("dotenv").config();
const HF_API_KEY = process.env.HF_API_KEY;
const CHAT_MODEL = "deepseek-ai/DeepSeek-R1:novita";

// === Helper: remove <think> blocks from chat output ===
function extractLazyDocsUpdate(raw) {
  // 1. Remove any <think>...</think> blocks
  const noThink = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // 2. Extract only the LAZYDOCS section
  const match = noThink.match(/<!-- LAZYDOCS START -->([\s\S]*?)<!-- LAZYDOCS END -->/);
  return match
    ? `<!-- LAZYDOCS START -->\n${match[1].trim()}\n<!-- LAZYDOCS END -->`
    : noThink;
}




/**
 * Use LLM to polish raw project info into a professional README format
 */
async function updateLazyDocs(diffText) {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: {
        "Authorization": `Bearer ${HF_API_KEY}`, // your HF token here
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
        model: CHAT_MODEL, // or whichever chat model you want
        messages: [
            {
            role: "system",
            content: "You are a documentation generator. Update the existing LAZYDOCS.md. It must include a **Project Summary** (describing what the project is about in plain English), along with Overview, Tech Stack, Installation, Usage, and Project Structure. DO NOT summarize, collapse, or shorten the Project Structure section, return the same way i sent you can add those #comments."
            },
            {
            role: "user",
            content: `Here is the git diff:\n\n${diffText}\n\nUpdate LAZYDOCS.md to reflect these changes. Append new sections if needed.`
            }
        ],
        max_tokens: 500,
        }),
    });

    if (!response.ok) {
        throw new Error(`HF API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "No update generated.";
    return extractLazyDocsUpdate(message);
}

// Example usage:
updateLazyDocs("diff --git a/src/app.js b/src/app.js\n+ Added login route")
  .then(update => {
    console.log("Updated LAZYDOCS.md section:\n", update);
    // here you’d append it to LAZYDOCS.md file programmatically if allowed
  })
  .catch(err => console.error(err));

module.exports = updateLazyDocs;