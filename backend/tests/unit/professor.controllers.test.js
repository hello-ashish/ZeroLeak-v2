/**
 * tests/unit/professor.controllers.test.js
 *
 * Tests the bug fixes applied to professor.controllers.js:
 *   - Bug #1 : submitBatch crashes if batch not found (null check)
 *   - Bug #14: submitBatch allows submitting empty batches
 *
 * All DB calls are mocked — no MongoDB needed.
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

// ─── Mock Batch model ─────────────────────────────────────────────────────────
const mockBatchSave = jest.fn();
const mockFindOne = jest.fn();

jest.unstable_mockModule("../../src/models/batch.models.js", () => ({
    Batch: { findOne: mockFindOne },
}));

// ─── Mock notification controller ─────────────────────────────────────────────
const mockNotifyAdmins = jest.fn().mockResolvedValue(undefined);
jest.unstable_mockModule("../../src/controllers/notification.controllers.js", () => ({
    notifyAdmins: mockNotifyAdmins,
    createNotification: jest.fn().mockResolvedValue(undefined),
}));

// ─── Import subject under test (after mocks) ─────────────────────────────────
const { submitBatch } = await import("../../src/controllers/professor.controllers.js");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal Express-like mock req */
function makeReq(batchId, professorId = "prof123") {
    return {
        params: { batchId },
        professor: { _id: professorId },
    };
}

function makeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("submitBatch", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Bug #1 — was crashing with "Cannot read properties of null" when batch not found
    test("BUG #1 FIX: returns 404 when batch is not found (no crash)", async () => {
        mockFindOne.mockResolvedValue(null); // batch not found
        const req = makeReq("nonexistent-id");
        const res = makeRes();

        await submitBatch(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining("not found") })
        );
        // notifyAdmins must NOT be called on null batch
        expect(mockNotifyAdmins).not.toHaveBeenCalled();
    });

    // Bug #14 — professors could submit empty batches
    test("BUG #14 FIX: returns 400 when batch has 0 questions", async () => {
        mockFindOne.mockResolvedValue({
            _id: "batch1",
            title: "Empty Batch",
            status: "Draft",
            questions: [],        // ← empty
            save: mockBatchSave,
        });
        const req = makeReq("batch1");
        const res = makeRes();

        await submitBatch(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining("empty") })
        );
        expect(mockBatchSave).not.toHaveBeenCalled();
    });

    test("BUG #14 FIX: returns 400 when batch.questions is undefined", async () => {
        mockFindOne.mockResolvedValue({
            _id: "batch2",
            title: "No Q Batch",
            status: "MarkForReview",
            questions: undefined, // ← undefined
            save: mockBatchSave,
        });
        const req = makeReq("batch2");
        const res = makeRes();

        await submitBatch(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockBatchSave).not.toHaveBeenCalled();
    });

    test("returns 400 if batch is in Accepted/Rejected/Submitted status", async () => {
        mockFindOne.mockResolvedValue({
            _id: "batch3",
            title: "Already submitted",
            status: "Submitted",
            questions: [{ title: "Q1" }],
            save: mockBatchSave,
        });
        const req = makeReq("batch3");
        const res = makeRes();

        await submitBatch(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockBatchSave).not.toHaveBeenCalled();
    });

    test("successfully submits a valid Draft batch with questions", async () => {
        const fakeBatch = {
            _id: "batch4",
            title: "Good Batch",
            status: "Draft",
            questions: [{ title: "Q1", options: ["a", "b"], correctAnswer: "a", correctAnswerIndex: 0 }],
            save: jest.fn().mockResolvedValue({ _id: "batch4", title: "Good Batch", status: "Submitted" }),
        };
        mockFindOne.mockResolvedValue(fakeBatch);
        const req = makeReq("batch4");
        const res = makeRes();

        await submitBatch(req, res);

        expect(fakeBatch.status).toBe("Submitted");
        expect(fakeBatch.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockNotifyAdmins).toHaveBeenCalled();
    });

    test("successfully submits a valid MarkForReview batch with questions", async () => {
        const fakeBatch = {
            _id: "batch5",
            title: "Review Batch",
            status: "MarkForReview",
            questions: [{ title: "Q1" }, { title: "Q2" }],
            save: jest.fn().mockResolvedValue({}),
        };
        mockFindOne.mockResolvedValue(fakeBatch);
        const req = makeReq("batch5");
        const res = makeRes();

        await submitBatch(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });
});
