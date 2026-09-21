import crypto from 'crypto';
import {
    encryptQuestionContent,
    decryptQuestionContent,
    hashQuestionContent,
    verifyQuestionIntegrity
} from '../crypto.service.js';

// Generate a valid 32-byte key for testing
const TEST_KEY = crypto.randomBytes(32).toString('base64');

describe('Question Encryption/Decryption Integrity', () => {
    beforeAll(() => {
        process.env.QUESTION_ENCRYPTION_KEY = TEST_KEY;
    });

    describe('encrypt → decrypt roundtrip', () => {
        it('should produce identical plaintext after roundtrip', () => {
            const original = {
                title: 'What is 2+2?',
                options: ['1', '2', '3', '4'],
                correctAnswer: '4',
                correctAnswerIndex: 3
            };

            const encrypted = encryptQuestionContent(original);
            const decrypted = decryptQuestionContent(encrypted);

            expect(decrypted).toEqual(original);
        });

        it('should produce different ciphertexts for the same plaintext (random IV)', () => {
            const content = { title: 'Test', options: ['A'], correctAnswerIndex: 0 };

            const enc1 = encryptQuestionContent(content);
            const enc2 = encryptQuestionContent(content);

            // Random IV means ciphertexts should differ
            expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
            expect(enc1.iv).not.toBe(enc2.iv);
        });
    });

    describe('tamper detection', () => {
        it('should throw on decryption with tampered ciphertext', () => {
            const content = { title: 'Secure Q', options: ['A', 'B'], correctAnswerIndex: 1 };
            const encrypted = encryptQuestionContent(content);

            // Tamper the ciphertext
            const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
            tamperedCiphertext[0] ^= 0xFF;
            encrypted.ciphertext = tamperedCiphertext.toString('base64');

            expect(() => decryptQuestionContent(encrypted)).toThrow();
        });

        it('should throw on decryption with tampered authTag', () => {
            const content = { title: 'Secure Q', options: ['A', 'B'], correctAnswerIndex: 1 };
            const encrypted = encryptQuestionContent(content);

            // Tamper the auth tag
            const tamperedTag = Buffer.from(encrypted.authTag, 'base64');
            tamperedTag[0] ^= 0xFF;
            encrypted.authTag = tamperedTag.toString('base64');

            expect(() => decryptQuestionContent(encrypted)).toThrow();
        });

        it('should throw on decryption with wrong IV', () => {
            const content = { title: 'Secure Q', options: ['A', 'B'], correctAnswerIndex: 1 };
            const encrypted = encryptQuestionContent(content);

            // Replace with a random IV
            encrypted.iv = crypto.randomBytes(12).toString('base64');

            expect(() => decryptQuestionContent(encrypted)).toThrow();
        });
    });

    describe('hashQuestionContent determinism', () => {
        it('should produce the same hash regardless of key order', () => {
            const content1 = { correctAnswerIndex: 0, title: 'Q', options: ['A', 'B'] };
            const content2 = { title: 'Q', options: ['A', 'B'], correctAnswerIndex: 0 };

            expect(hashQuestionContent(content1)).toBe(hashQuestionContent(content2));
        });

        it('should produce different hashes for different content', () => {
            const content1 = { title: 'Q1', options: ['A'], correctAnswerIndex: 0 };
            const content2 = { title: 'Q2', options: ['A'], correctAnswerIndex: 0 };

            expect(hashQuestionContent(content1)).not.toBe(hashQuestionContent(content2));
        });
    });

    describe('verifyQuestionIntegrity', () => {
        it('should return true for a valid ciphertext+hash pair', () => {
            const content = { title: 'Valid Q', options: ['A', 'B'], correctAnswerIndex: 0 };
            const hash = hashQuestionContent(content);
            const encrypted = encryptQuestionContent(content);

            expect(verifyQuestionIntegrity(encrypted, hash)).toBe(true);
        });

        it('should return false for tampered ciphertext', () => {
            const content = { title: 'Valid Q', options: ['A', 'B'], correctAnswerIndex: 0 };
            const hash = hashQuestionContent(content);
            const encrypted = encryptQuestionContent(content);

            // Tamper ciphertext
            const tampered = Buffer.from(encrypted.ciphertext, 'base64');
            tampered[0] ^= 0xFF;
            encrypted.ciphertext = tampered.toString('base64');

            expect(verifyQuestionIntegrity(encrypted, hash)).toBe(false);
        });

        it('should return false for a mismatched hash', () => {
            const content = { title: 'Valid Q', options: ['A', 'B'], correctAnswerIndex: 0 };
            const wrongHash = 'deadbeef'.repeat(8);
            const encrypted = encryptQuestionContent(content);

            expect(verifyQuestionIntegrity(encrypted, wrongHash)).toBe(false);
        });
    });
});
