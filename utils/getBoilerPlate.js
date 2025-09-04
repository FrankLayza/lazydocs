function getBoilerPlate() {
  return `## Installation
Clone the repo and install dependencies:

\`\`\`bash
git clone <repo-url>
cd <project>
npm install   # or yarn / pnpm
\`\`\`

## Usage
Run the development server:

\`\`\`bash
npm run dev
\`\`\`
`;
}

module.exports = getBoilerPlate