const fs = require('fs');
const p = '/Users/helloashish/Desktop/ZeroLeak-v2/backend/src/blockchain/__tests__/commitment.lifecycle.test.js';
let content = fs.readFileSync(p, 'utf8');

// replace the mock structure
content = content.replace(
    /IntegrityOutbox: \{\s*find: jest.fn\(\),\s*\}/,
    `IntegrityOutbox: {\n        findOneAndUpdate: jest.fn(),\n    }`
);

content = content.replace(
    /IntegrityOutbox\.find\.mockReturnValue\(\{[\s\S]*?\}\);/g,
    `IntegrityOutbox.findOneAndUpdate.mockResolvedValueOnce(outboxRecord).mockResolvedValueOnce(null);`
);

fs.writeFileSync(p, content);
