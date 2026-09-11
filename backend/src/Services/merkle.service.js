import crypto from "crypto";

function hashPair(left, right) {
    return crypto
        .createHash("sha256")
        .update(left + right, "utf8")
        .digest("hex");
}

export function buildMerkleRoot(hashes) {
    if (!Array.isArray(hashes) || hashes.length === 0) {
        throw new Error(
            "At least one hash is required to build a Merkle tree."
        );
    }

    const invalidHashes = hashes.filter(
        (hash) =>
            typeof hash !== "string" ||
            !/^[a-fA-F0-9]{64}$/.test(hash)
    );

    if (invalidHashes.length > 0) {
        throw new Error(
            "Merkle tree can only be built from valid SHA-256 hashes."
        );
    }

    let level = [...hashes];

    while (level.length > 1) {
        const nextLevel = [];

        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];

            const right =
                level[i + 1] !== undefined
                    ? level[i + 1]
                    : level[i];

            nextLevel.push(
                hashPair(left, right)
            );
        }

        level = nextLevel;
    }

    return level[0];
}