import { summarize } from "../summarize.js";
import { commit } from "../commit.js";

/**
 * Controller to handle summarization requests
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function mortySummarize(req, res) {
  try {
    const { content } = req.body;
    if (!content || typeof content !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or invalid 'content' in request body." });
    }
    const summary = await summarize(content);
    res.json({ summary });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message || "Failed to summarize content." });
  }
}

export async function mortyCommit(req, res) {
  try {
    const { diff } = req.body;
    if (!diff) {
      return res.status(400).json({ error: "invalid content in the req body" });
    }
    const commitResult = await commit(diff)
    res.json({commitResult})
  } catch (error) {
    res.status(500).json({error: error.message})
  }
}
