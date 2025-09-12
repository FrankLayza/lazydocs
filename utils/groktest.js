const fs = require("fs")
const path = require("path")
async function getOverview(projectPath) {
    let hasComments = false;
    let projectContent = ''; // To collect file contents for LLM

    // Function to recursively loop through files
    function traverseDirectory(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (!file.startsWith('.') && file !== 'node_modules') { // Skip hidden and node_modules
                    traverseDirectory(fullPath);
                }
            } else {
                // Check first 10 lines for comments
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\n').slice(0, 10);
                const commentPatterns = [/^\s*\/\/|\/\*|#|<!--|"""/]; // Common comment starters
                if (lines.some(line => commentPatterns.some(pattern => pattern.test(line)))) {
                    hasComments = true;
                }
                // Collect content for LLM (limit to code files, e.g., .js, .ts, etc.)
                if (path.extname(file).match(/\.(js|ts|jsx|tsx|py|java|c|cpp)$/)) {
                    projectContent += `\n\nFile: ${file}\n${content}`;
                }
            }
        }
    }

    traverseDirectory(projectPath);

    if (hasComments) {
        return 'Project has comments in files. Extract overview from comments manually.';
        // You could enhance this to actually extract and summarize comments
    } else {
        // Integrate LLM to generate overview
        return await generateOverviewWithLLM(projectContent);
    }
}

async function generateOverviewWithLLM(content) {
    const prompt = `Generate a concise summary overview of the following project based on its code files. Focus on the main purpose, key components, and technologies used:\n\n${content}`;

    try {
        // Example using xAI Grok API (replace with your API key and endpoint)
        const response = await axios.post('https://api.x.ai/v1/chat/completions', { // Hypothetical endpoint
            model: 'grok-4',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
        }, {
            headers: {
                'Authorization': 'Bearer YOUR_API_KEY_HERE',
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        throw new Error(`LLM API error: ${error.message}`);
    }
}
