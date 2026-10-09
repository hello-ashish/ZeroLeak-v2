/**
 * tests/unit/exam.controllers.test.js
 *
 * Tests the bug fixes applied to exam.controllers.js:
 *   - Bug #2 : createExam fails if examinationId is missing from request body
 *
 * All DB calls are mocked.
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const mockExamCreate = jest.fn();
const mockQuestionFind = jest.fn();
const mockBuildMerkleRoot = jest.fn();
const mockAuditLogCreate = jest.fn();
const mockEnqueueExamCommitment = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule("../../src/models/exam.models.js", () => ({
    Exam: { create: mockExamCreate },
}));

jest.unstable_mockModule("../../src/models/question.models.js", () => ({
    Question: { find: mockQuestionFind },
}));

jest.unstable_mockModule("../../src/Services/merkle.service.js", () => ({
    buildMerkleRoot: mockBuildMerkleRoot,
}));

jest.unstable_mockModule("../../src/models/auditlog.models.js", () => ({
    AuditLog: { create: mockAuditLogCreate },
}));

jest.unstable_mockModule("../../src/Services/integrityOutbox.service.js", () => ({
    enqueueExamCommitment: mockEnqueueExamCommitment,
}));

// Load the controller under test
const { createExam } = await import("../../src/controllers/exam.controllers.js");

function makeReq(body) {
    return {
        body,
        admin: { _id: "admin1", email: "admin@example.com" },
    };
}

function makeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("createExam", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("BUG #2 FIX: returns 400 if examinationId is missing", async () => {
        const req = makeReq({
            title: "Test Exam",
            description: "Test Desc",
            duration: 60,
            questions: ["q1"],
            // examinationId is intentionally missing
        });
        const res = makeRes();

        await createExam(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining("examinationId is required") })
        );
        expect(mockExamCreate).not.toHaveBeenCalled();
    });

    test("successfully creates exam when examinationId is provided", async () => {
        const req = makeReq({
            title: "Test Exam",
            description: "Test Desc",
            duration: 60,
            questions: ["q1"],
            examinationId: "examId123",
            subject: "Math",
        });
        const res = makeRes();

        mockQuestionFind.mockReturnValue({
            select: jest.fn().mockResolvedValue([{ _id: "q1", contentHash: "0000000000000000000000000000000000000000000000000000000000000000", encryptedContent: "encrypted_stuff" }]),
        });
        mockBuildMerkleRoot.mockReturnValue("merkleRoot123");
        mockExamCreate.mockResolvedValue({ _id: "exam1", title: "Test Exam" });

        await createExam(req, res);

        expect(mockExamCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                examinationId: "examId123",
                subject: "Math",
            })
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Exam created successfully" })
        );
    });
});
