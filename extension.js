// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs')
const path = require('path')
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

// function generateDocsMessage(name){
// 	return `LazyDocs says: Generating docs for ${name}`
// }


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
	const disposable = vscode.commands.registerCommand('lazydocs.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from LazyDocs!');
	});
	const disposable2 = vscode.commands.registerCommand('lazydocs.generateDocs', async function(){
		const folders = vscode.workspace.workspaceFolders;
		if(!folders){
			vscode.window.showErrorMessage("No workspace folder open")
			return
		}
		//get the root path of the workspace
		const getRoot = folders[0].uri.fsPath

		//get the path of the generated file
		const filePath = path.join(getRoot, "LAZYDOCS.md")

		//write something in the file
		fs.writeFileSync(filePath, "# LazyDocs\nGenerated Docs go here.\n")
		// const message = generateDocsMessage('myProject');
		vscode.window.showInformationMessage(`Docs generated in ${filePath}`)
	})

	context.subscriptions.push(disposable, disposable2);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
