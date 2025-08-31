// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

// function generateDocsMessage(name){
// 	return `LazyDocs says: Generating docs for ${name}`
// }

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

//this is the default hello world function
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "lazydocs" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "lazydocs.helloWorld",
    function () {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from LazyDocs!");
    }
  );
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
	  const treeFormat = formatTree(results)
      const result = results.map((item) => item.name).join("\n");
      const output = vscode.window.createOutputChannel("LazyDocs");
      output.show();
      output.appendLine(treeFormat);
      console.log("scan results: ", treeFormat);
      vscode.window.showInformationMessage(`scan results: ${result}`);
    }
  );

  context.subscriptions.push(disposable, disposable2);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
