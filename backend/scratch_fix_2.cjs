const fs = require('fs');

let content = fs.readFileSync('/Users/helloashish/Desktop/ZeroLeak-v2/backend/src/controllers/admin.controllers.js', 'utf8');

content = content.replace(
    /if \(batch\.status === 'Accepted' && batch\.blockchainBlockHash\) \{[\s\S]*?return res\.status\(400\)\.json\(\{ message: 'Batch is already accepted and committed to the blockchain ledger\.' \}\);\s*\}/,
    `if (batch.status === 'Accepted') {
                if (batch.commitmentId) {
                    const outbox = await IntegrityOutbox.findOne({ eventId: batch.commitmentId });
                    if (outbox) {
                        if (outbox.status === 'FAILED') {
                            outbox.status = 'PENDING';
                            outbox.retryCount = 0;
                            outbox.lastError = null;
                            await outbox.save();
                            return res.status(200).json({ message: 'Batch commitment retry initiated.', batch, outboxStatus: outbox.status });
                        }
                        return res.status(200).json({ message: \`Batch is already accepted. Commitment status: \${outbox.status}\`, batch, outboxStatus: outbox.status });
                    }
                }
                return res.status(200).json({ message: 'Batch is already accepted.', batch });
            }`
);

fs.writeFileSync('/Users/helloashish/Desktop/ZeroLeak-v2/backend/src/controllers/admin.controllers.js', content);
