const csstree = require("css-tree")
const fs = require("fs")
const path = require("path")

async function parseCssFiles(dir){
    const folders = fs.readdirSync(dir)

    for(const folder of folders){
        const fullPath = path.join(dir, folder)
        const stat = fs.statSync(fullPath)

        if(stat.isDirectory()){
            if(folder !== "node_modules"){
                parseCssFiles(fullPath)
            }
            continue;
        }

        if(path.extname(fullPath).match(/\.css$/)) continue;

        try {
            const source = fs.readFileSync(fullPath, "utf-8")
            const ast = csstree.parse(source)
        } catch (error) {
            console.error(`Error processing ${fullPath}: ${error.message}`);
        }
    }
    
}