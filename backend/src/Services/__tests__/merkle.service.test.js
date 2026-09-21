import { buildMerkleRoot } from "../merkle.service.js";
import crypto from "crypto";

const sha256 = (val) => crypto.createHash("sha256").update(val, "utf8").digest("hex");

describe("Merkle Service", () => {
    const hashes = [
        sha256("q1"),
        sha256("q2"),
        sha256("q3")
    ];

    describe("v1 (Lexicographical / Order Independent)", () => {
        it("should produce the same root regardless of order", () => {
            const root1 = buildMerkleRoot(hashes, { version: "v1" });
            const root2 = buildMerkleRoot([hashes[2], hashes[0], hashes[1]], { version: "v1" });
            expect(root1).toEqual(root2);
        });

        it("should fall back to v1 if no version is provided", () => {
            const root1 = buildMerkleRoot(hashes);
            const root2 = buildMerkleRoot(hashes, { version: "v1" });
            expect(root1).toEqual(root2);
        });
    });

    describe("v2 (Positional / Order Dependent)", () => {
        it("should produce the same root for the same order", () => {
            const root1 = buildMerkleRoot([...hashes], { version: "v2" });
            const root2 = buildMerkleRoot([...hashes], { version: "v2" });
            expect(root1).toEqual(root2);
        });

        it("should produce a different root when order changes", () => {
            const root1 = buildMerkleRoot(hashes, { version: "v2" });
            const root2 = buildMerkleRoot([hashes[1], hashes[0], hashes[2]], { version: "v2" });
            expect(root1).not.toEqual(root2);
        });

        it("should produce a different root when a hash is tampered", () => {
            const root1 = buildMerkleRoot(hashes, { version: "v2" });
            const tamperedHashes = [...hashes];
            tamperedHashes[1] = sha256("q2_tampered");
            const root2 = buildMerkleRoot(tamperedHashes, { version: "v2" });
            expect(root1).not.toEqual(root2);
        });
    });

    describe("Tampering Detection (Attack Vectors)", () => {
        it("should detect addition attack (extra question inserted)", () => {
            const root1 = buildMerkleRoot(hashes, { version: "v2" });
            const extendedHashes = [...hashes, sha256("q4_injected")];
            const root2 = buildMerkleRoot(extendedHashes, { version: "v2" });
            expect(root1).not.toEqual(root2);
        });

        it("should detect deletion attack (question removed)", () => {
            const root1 = buildMerkleRoot(hashes, { version: "v2" });
            const reducedHashes = [hashes[0], hashes[2]]; // removed q2
            const root2 = buildMerkleRoot(reducedHashes, { version: "v2" });
            expect(root1).not.toEqual(root2);
        });

        it("should detect substitution attack (question replaced)", () => {
            const root1 = buildMerkleRoot(hashes, { version: "v2" });
            const substitutedHashes = [hashes[0], sha256("malicious_replacement"), hashes[2]];
            const root2 = buildMerkleRoot(substitutedHashes, { version: "v2" });
            expect(root1).not.toEqual(root2);
        });

        it("v1 should also detect addition and deletion attacks", () => {
            const root1 = buildMerkleRoot(hashes, { version: "v1" });

            // Addition
            const extended = [...hashes, sha256("q_extra")];
            expect(buildMerkleRoot(extended, { version: "v1" })).not.toEqual(root1);

            // Deletion
            const reduced = [hashes[0], hashes[1]];
            expect(buildMerkleRoot(reduced, { version: "v1" })).not.toEqual(root1);
        });

        it("v2 should detect reorder attack (positions swapped)", () => {
            const root1 = buildMerkleRoot(hashes, { version: "v2" });
            const swapped = [hashes[2], hashes[1], hashes[0]]; // reversed
            const root2 = buildMerkleRoot(swapped, { version: "v2" });
            expect(root1).not.toEqual(root2);
        });
    });
});
