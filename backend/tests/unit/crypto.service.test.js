/**
 * tests/unit/crypto.service.test.js
 *
 * Unit tests for the crypto service — no DB, no external deps.
 * Tests: hashQuestionContent, encryptQuestionContent,
 *        decryptQuestionContent, verifyQuestionIntegrity
 */

import { describe, test, expect } from "@jest/globals";

// Set the env var before importing the service
process.env.QUESTION_ENCRYPTION_KEY = "qXA5UijFDNo2i7S5+mhxTVhYO0BCwbcfHAEKTvuDcPA=";

import {
    hashQuestionContent,
    encryptQuestionContent,
    decryptQuestionContent,
    verifyQuestionIntegrity,
} from "../../src/Services/crypto.service.js";

const SAMPLE_CONTENT = {
    title: "What is 2 + 2?",
    options: ["1", "2", "4", "8"],
    correctAnswer: "4",
    correctAnswerIndex: 2,
};

// ─── hashQuestionContent ──────────────────────────────────────────────────────

describe("hashQuestionContent", () => {
    test("returns a 64-char hex SHA-256 hash", () => {
        const hash = hashQuestionContent(SAMPLE_CONTENT);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test("is deterministic — same input always yields same hash", () => {
        const h1 = hashQuestionContent(SAMPLE_CONTENT);
        const h2 = hashQuestionContent(SAMPLE_CONTENT);
        expect(h1).toBe(h2);
    });

    test("is order-independent on keys (canonical serialization)", () => {
        // Reverse key order — should produce same hash
        const shuffled = {
            correctAnswerIndex: SAMPLE_CONTENT.correctAnswerIndex,
            correctAnswer: SAMPLE_CONTENT.correctAnswer,
            options: SAMPLE_CONTENT.options,
            title: SAMPLE_CONTENT.title,
        };
        expect(hashQuestionContent(shuffled)).toBe(hashQuestionContent(SAMPLE_CONTENT));
    });

    test("different content produces different hash", () => {
        const other = { ...SAMPLE_CONTENT, correctAnswerIndex: 0 };
        expect(hashQuestionContent(other)).not.toBe(hashQuestionContent(SAMPLE_CONTENT));
    });
});

// ─── encryptQuestionContent / decryptQuestionContent ─────────────────────────

describe("encryptQuestionContent + decryptQuestionContent", () => {
    test("encrypt returns object with ciphertext, iv, authTag", () => {
        const encrypted = encryptQuestionContent(SAMPLE_CONTENT);
        expect(encrypted).toHaveProperty("ciphertext");
        expect(encrypted).toHaveProperty("iv");
        expect(encrypted).toHaveProperty("authTag");
    });

    test("decrypt restores original content", () => {
        const encrypted = encryptQuestionContent(SAMPLE_CONTENT);
        const decrypted = decryptQuestionContent(encrypted);
        expect(decrypted).toEqual(SAMPLE_CONTENT);
    });

    test("two encryptions of same content produce different ciphertexts (random IV)", () => {
        const enc1 = encryptQuestionContent(SAMPLE_CONTENT);
        const enc2 = encryptQuestionContent(SAMPLE_CONTENT);
        // IVs must differ due to randomness
        expect(enc1.iv).not.toBe(enc2.iv);
        // Both still decrypt correctly
        expect(decryptQuestionContent(enc1)).toEqual(SAMPLE_CONTENT);
        expect(decryptQuestionContent(enc2)).toEqual(SAMPLE_CONTENT);
    });

    test("tampered ciphertext throws on decrypt", () => {
        const encrypted = encryptQuestionContent(SAMPLE_CONTENT);
        const tampered = {
            ...encrypted,
            ciphertext: Buffer.from("tampered").toString("base64"),
        };
        expect(() => decryptQuestionContent(tampered)).toThrow();
    });
});

// ─── verifyQuestionIntegrity ──────────────────────────────────────────────────

describe("verifyQuestionIntegrity", () => {
    test("returns true for valid encrypted content + matching hash", () => {
        const encrypted = encryptQuestionContent(SAMPLE_CONTENT);
        const hash = hashQuestionContent(SAMPLE_CONTENT);
        expect(verifyQuestionIntegrity(encrypted, hash)).toBe(true);
    });

    test("returns false for mismatched hash", () => {
        const encrypted = encryptQuestionContent(SAMPLE_CONTENT);
        const wrongHash = hashQuestionContent({ ...SAMPLE_CONTENT, title: "Different" });
        expect(verifyQuestionIntegrity(encrypted, wrongHash)).toBe(false);
    });

    test("returns false for tampered encrypted content", () => {
        const encrypted = encryptQuestionContent(SAMPLE_CONTENT);
        const hash = hashQuestionContent(SAMPLE_CONTENT);
        const tampered = { ...encrypted, ciphertext: Buffer.from("x").toString("base64") };
        expect(verifyQuestionIntegrity(tampered, hash)).toBe(false);
    });
});
