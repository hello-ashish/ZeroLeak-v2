import { jest } from '@jest/globals';
import { createCommitment, canonicalize, sha256 } from "../commitment.service.js";
import { IntegrityOutbox } from "../../models/integrityOutbox.models.js";

describe("commitment.service.js", () => {
    describe("canonicalize", () => {
        it("should deterministically sort object keys", () => {
            const obj1 = { b: 2, a: 1, c: { e: 5, d: 4 } };
            const obj2 = { a: 1, c: { d: 4, e: 5 }, b: 2 };
            
            const c1 = canonicalize(obj1);
            const c2 = canonicalize(obj2);
            
            expect(JSON.stringify(c1)).toBe(JSON.stringify(c2));
        });
    });

    describe("sha256", () => {
        it("should hash strings correctly", () => {
            const hash = sha256("test");
            expect(hash).toHaveLength(64);
        });
    });

    describe("createCommitment", () => {
        it("should generate a commitment and save it to the outbox", async () => {
            const originalFindOneAndUpdate = IntegrityOutbox.findOneAndUpdate;
            IntegrityOutbox.findOneAndUpdate = jest.fn().mockResolvedValue({
                eventId: "Test_123_1_TEST",
                canonicalHash: "fakehash"
            });

            try {
                const result = await createCommitment({
                    objectType: "Test",
                    objectId: "123",
                    commitmentType: "TEST",
                    payload: { key: "value" }
                });

                expect(IntegrityOutbox.findOneAndUpdate).toHaveBeenCalled();
            } finally {
                IntegrityOutbox.findOneAndUpdate = originalFindOneAndUpdate;
            }
        });
    });
});
