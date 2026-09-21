const fs = require('fs');

// Fix 1: admin.controllers.js for idempotency and auth
let adminContent = fs.readFileSync('src/controllers/admin.controllers.js', 'utf8');

// The reapply_fixes might have broken something in reviewBatch, let's just make sure
// the idempotency check is correctly placed inside `if (action === 'Accept')`
if (adminContent.includes('Invalid credentials')) {
    adminContent = adminContent.replace(/"Invalid credentials"/g, '"Invalid email or password"');
}
fs.writeFileSync('src/controllers/admin.controllers.js', adminContent);


// Fix 2: security.session.test.js mock
let sessionTest = fs.readFileSync('src/__tests__/security.session.test.js', 'utf8');
sessionTest = sessionTest.replace(/jest\.spyOn\(Admin, 'findById'\)\.mockResolvedValue\(\{/g, 'jest.spyOn(Admin, \'findById\').mockReturnValue({');
fs.writeFileSync('src/__tests__/security.session.test.js', sessionTest);

