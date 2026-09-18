const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend', 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(directoryPath);
let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const badCode = `    if (loading) {\r\n            React.useEffect(() => {\r\n        window.refreshCurrentPage = fetchData;\r\n        return () => { window.refreshCurrentPage = null; };\r\n    }, []);`;
    const badCodeLf = `    if (loading) {\n            React.useEffect(() => {\n        window.refreshCurrentPage = fetchData;\n        return () => { window.refreshCurrentPage = null; };\n    }, []);`;
    const replaceWith = `    if (loading) {`;
    
    if (content.includes(badCode)) {
        content = content.replace(badCode, replaceWith);
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
        console.log(`Fixed: ${file}`);
    } else if (content.includes(badCodeLf)) {
        content = content.replace(badCodeLf, replaceWith);
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
        console.log(`Fixed: ${file}`);
    }
});

console.log(`Finished fixing ${modifiedCount} files.`);
