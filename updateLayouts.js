const fs = require('fs');

const layouts = [
    'frontend/src/pages/admin/AdminLayout.jsx',
    'frontend/src/pages/professor/ProfessorLayout.jsx',
    'frontend/src/pages/student/StudentLayout.jsx',
    'frontend/src/pages/auditor/AuditorLayout.jsx'
];

layouts.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('Refresh Page')) return; // already added

    // Add RefreshCw to lucide-react import
    if (!content.includes('RefreshCw')) {
        content = content.replace(/(import {[^}]+)(} from 'lucide-react')/, '$1, RefreshCw $2');
    }

    // Insert button after HeaderThemeSlider
    const buttonHtml = `
                        {/* Refresh Button */}
                        <button
                            className="topbar-btn"
                            onClick={() => window.refreshCurrentPage && window.refreshCurrentPage()}
                            title="Refresh Page"
                            aria-label="Refresh Page"
                        >
                            <RefreshCw size={18} />
                        </button>
`;
    content = content.replace(/(<HeaderThemeSlider \/>)/, `$1\n${buttonHtml}`);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
});
