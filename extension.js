// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

//The getTitle function that checks the current working directory and search for a package.json to get the project name or fallback to the folder name



//the scanROOT function to get a structure of the CWD
function scanRoot(rootPath) {
  const results = [];

  const items = fs.readdirSync(rootPath);
  for (const item of items) {
    const fullPath = path.join(rootPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      console.log(item, "is a folder");
      results.push({
        type: "folder",
        name: item,
        children: scanRoot(fullPath),
      });
    } else {
      console.log(item, "is a file");
      results.push({ type: "file", name: item });
    }
  }

  return results;
}
function formatTree(results, depth = 0) {
  let output = "";
  const indent = "  ".repeat(depth);

  for (const item of results) {
    if (item.type === "folder") {
      output += `${indent}📂 ${item.name}\n`;
      output += formatTree(item.children, depth + 1);
    } else {
      output += `${indent}📄 ${item.name}\n`;
    }
  }

  return output;
}
/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "lazydocs" is now active!');

  const disposable2 = vscode.commands.registerCommand(
    "lazydocs.generateDocs",
    async function () {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders) {
        vscode.window.showErrorMessage("No workspace folder open");
        return;
      }
      const rootPath = folders[0].uri.fsPath;
      const results = scanRoot(rootPath);
      const treeFormat = formatTree(results);
      const result = results.map((item) => item.name).join("\n");
      const output = vscode.window.createOutputChannel("LazyDocs");
      output.show();
      output.appendLine(treeFormat);
      const filePath = path.join(rootPath, "LAZYDOCS.md");
      fs.appendFileSync(
        filePath,
        `# Project Name \n## File Structure \n${treeFormat}`
      );
      console.log("scan results: ", treeFormat);
      vscode.window.showInformationMessage(`scan results: ${result}`);
    }
  );

  context.subscriptions.push(disposable2);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
