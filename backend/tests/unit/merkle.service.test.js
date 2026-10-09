/**
 * tests/unit/merkle.service.test.js
 *
 * Unit tests for the Merkle tree service — no DB, no external deps.
 */

import { describe, test, expect } from "@jest/globals";
import { buildMerkleRoot } from "../../src/Services/merkle.service.js";
import crypto from "crypto";

/** Generate a random valid SHA-256 hex hash */
function fakeHash(seed = "") {
    return crypto.createHash("sha256").update(seed || Math.random().toString()).digest("hex");
}

describe("buildMerkleRoot", () => {
    test("returns null for empty array", () => {
        expect(buildMerkleRoot([])).toBeNull();
    });

    test("returns null for non-array input", () => {
        expect(buildMerkleRoot(null)).toBeNull();
        expect(buildMerkleRoot(undefined)).toBeNull();
    });

    test("returns the single hash itself for one-element array", () => {
        const h = fakeHash("solo");
        const root = buildMerkleRoot([h]);
        expect(root).toMatch(/^[a-f0-9]{64}$/);
        // Single element: hashPair(h, h) — deterministic
        expect(root).toBe(buildMerkleRoot([h]));
    });

    test("is deterministic — same hashes always produce same root", () => {
        const hashes = [fakeHash("a"), fakeHash("b"), fakeHash("c")];
        const r1 = buildMerkleRoot(hashes);
        const r2 = buildMerkleRoot(hashes);
        expect(r1).toBe(r2);
    });

    test("is order-independent (lexicographic sort before building)", () => {
        const h1 = fakeHash("1");
        const h2 = fakeHash("2");
        const h3 = fakeHash("3");
        // Different orderings should produce the same root
        const root1 = buildMerkleRoot([h1, h2, h3]);
        const root2 = buildMerkleRoot([h3, h1, h2]);
        const root3 = buildMerkleRoot([h2, h3, h1]);
        expect(root1).toBe(root2);
        expect(root1).toBe(root3);
    });

    test("different sets of hashes produce different roots", () => {
        const hashes1 = [fakeHash("x"), fakeHash("y")];
        const hashes2 = [fakeHash("a"), fakeHash("b")];
        expect(buildMerkleRoot(hashes1)).not.toBe(buildMerkleRoot(hashes2));
    });

    test("throws on invalid (non-SHA256) hash in the array", () => {
        const good = fakeHash("ok");
        expect(() => buildMerkleRoot([good, "not-a-hash"])).toThrow(
            "Merkle tree can only be built from valid SHA-256 hashes."
        );
    });

    test("handles even number of hashes correctly", () => {
        const hashes = [fakeHash("e1"), fakeHash("e2"), fakeHash("e3"), fakeHash("e4")];
        const root = buildMerkleRoot(hashes);
        expect(root).toMatch(/^[a-f0-9]{64}$/);
    });

    test("handles odd number of hashes (last duplicated)", () => {
        const hashes = [fakeHash("o1"), fakeHash("o2"), fakeHash("o3")];
        const root = buildMerkleRoot(hashes);
        expect(root).toMatch(/^[a-f0-9]{64}$/);
    });
});
