// Import assert for writing test assertions
const assert = require("assert");
// Import VS Code API for showing info during tests
const vscode = require("vscode");
// Import commit message generator utility
const { generateCommitMessage } = require("../utils/commitMessageGenerator");

/**
 * Extension Test Suite
 * - Runs basic sample test
 * - Tests commit message generator (manual real API call)
 */
suite("Extension Test Suite", () => {
  // Show notification when tests start
  vscode.window.showInformationMessage("Start all tests.");

  // Basic sanity check (example test)
  test("Sample test", () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });

  // Commit message generator tests
  suite("Auto-Generated Commit Messages", () => {
    /**
     * Test: Real API call (requires valid Hugging Face token)
     * - Uses a small hardcoded diff
     * - Ensures a commit message is returned (not fallback)
     * ⚠️ Note: Comment out in CI to avoid network dependency
     */
    test("should generate commit message with real API", async () => {
      // Example diff with staged changes
      const diff = `File: App.tsx\n+ console.log("New feature");\nFile: README.md\n+ ## New Section`;

      // Call generator
      const message = await generateCommitMessage(diff);

      // Verify output is not fallback
      assert.notStrictEqual(
        message,
        "Changes detected, please provide a commit message.",
        "Got fallback. Check API token/internet."
      );

      // Log message for debugging
      console.log("Generated message:", message);
    });
  });
});
