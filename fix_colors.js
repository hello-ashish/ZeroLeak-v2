const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/BlockchainVisualizer.jsx', 'utf8');

// Container & Global
content = content.replace(/background: '#0a0a0f'/g, "background: 'var(--bg-app)'");
content = content.replace(/color: '#fff'/g, "color: 'var(--text-primary)'");
content = content.replace(/border: '1px solid rgba\(255,255,255,0\.1\)'/g, "border: '1px solid var(--border-default)'");

// Controls & Search
content = content.replace(/background: 'rgba\(255,255,255,0\.03\)'/g, "background: 'var(--bg-card)'");
content = content.replace(/borderBottom: '1px solid rgba\(255,255,255,0\.08\)'/g, "borderBottom: '1px solid var(--border-default)'");
content = content.replace(/color: '#888'/g, "color: 'var(--text-secondary)'");
content = content.replace(/border: '1px solid rgba\(255,255,255,0\.1\)'/g, "border: '1px solid var(--border-default)'");
content = content.replace(/background: 'rgba\(0,0,0,0\.3\)'/g, "background: 'var(--bg-input)'");
content = content.replace(/background: 'rgba\(0,0,0,0\.4\)'/g, "background: 'var(--bg-input)'");

// Canvas
content = content.replace(/radial-gradient\(circle at center, #11111a 0%, #050508 100%\)/g, "radial-gradient(circle at center, var(--bg-surface) 0%, var(--bg-app) 100%)");

// Lines
content = content.replace(/background: 'rgba\(255,255,255,0\.2\)'/g, "background: 'var(--border-strong)'");
content = content.replace(/background: 'rgba\(255,255,255,0\.1\)'/g, "background: 'var(--border-default)'");

// Blocks
content = content.replace(/boxShadow: .*?'0 4px 20px rgba\(0,0,0,0\.5\)'/g, "boxShadow: isVerifying ? '0 0 20px var(--brand-primary-border)' : 'var(--shadow-md)'");
content = content.replace(/'rgba\(255,255,255,0\.1\)'/g, "'var(--border-default)'");
content = content.replace(/color: '#e2e8f0'/g, "color: 'var(--text-primary)'");
content = content.replace(/border: '1px solid rgba\(255,255,255,0\.05\)'/g, "border: '1px solid var(--border-subtle)'");

// Drawer
content = content.replace(/background: 'rgba\(15, 15, 20, 0\.98\)'/g, "background: 'var(--bg-elevated)'");
content = content.replace(/boxShadow: '-10px 0 30px rgba\(0,0,0,0\.5\)'/g, "boxShadow: 'var(--shadow-xl)'");

// Text Colors
content = content.replace(/color: '#a1a1aa'/g, "color: 'var(--text-secondary)'");
content = content.replace(/color: '#71717a'/g, "color: 'var(--text-tertiary)'");
content = content.replace(/color: '#52525b'/g, "color: 'var(--text-disabled)'");

// Buttons & Misc
content = content.replace(/background: 'rgba\(255,255,255,0\.05\)'/g, "background: 'var(--bg-hover)'");

fs.writeFileSync('frontend/src/components/BlockchainVisualizer.jsx', content);
console.log('Fixed colors');
