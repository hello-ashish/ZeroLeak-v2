const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else if (name.endsWith('.jsx')) {
            files.push(name);
        }
    }
    return files;
}

const files = getFiles('frontend/src/pages');
let modified = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    if (!content.includes('const fetchData =')) return;
    if (content.includes('window.refreshCurrentPage')) return;
    
    const match = content.match(/const fetchData = (async \([^)]*\)|[^(]*\([^)]*\)) => \{/);
    if (match) {
        content = content.replace(/(return \(\s*<)/, `    React.useEffect(() => {\n        window.refreshCurrentPage = fetchData;\n        return () => { window.refreshCurrentPage = null; };\n    }, []);\n\n    $1`);
        fs.writeFileSync(file, content, 'utf8');
        modified++;
        console.log(`Updated ${file}`);
    }
});
console.log(`Updated ${modified} files.`);
