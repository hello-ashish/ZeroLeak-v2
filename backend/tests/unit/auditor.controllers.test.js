/**
 * tests/unit/auditor.controllers.test.js
 *
 * Tests the bug fixes applied to auditor.controllers.js:
 *   - Bug #3 : updateAuditorProfile wrong request property (`req.auditor` instead of `req.user`)
 *
 * All DB calls are mocked.
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const mockAuditorFindById = jest.fn();

jest.unstable_mockModule("../../src/models/auditor.models.js", () => ({
    Auditor: { findById: mockAuditorFindById },
}));

const { updateAuditorProfile } = await import("../../src/controllers/auditor.controllers.js");

function makeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("updateAuditorProfile", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("BUG #3 FIX: successfully finds auditor using req.auditor._id", async () => {
        const req = {
            body: { name: "New Name" },
            auditor: { _id: "auditor123" }, // verifyAuditorJWT sets this
        };
        const res = makeRes();

        const fakeAuditor = {
            _id: "auditor123",
            name: "Old Name",
            save: jest.fn().mockResolvedValue(true),
            toObject: jest.fn().mockReturnValue({ name: "New Name" }),
        };
        mockAuditorFindById.mockResolvedValue(fakeAuditor);

        await updateAuditorProfile(req, res);

        expect(mockAuditorFindById).toHaveBeenCalledWith("auditor123");
        expect(fakeAuditor.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("BUG #3 FIX: successfully finds auditor using req.user._id (fallback)", async () => {
        const req = {
            body: { name: "New Name" },
            user: { _id: "user123" }, // verifyAnyJWT sets this
        };
        const res = makeRes();

        const fakeAuditor = {
            _id: "user123",
            name: "Old Name",
            save: jest.fn().mockResolvedValue(true),
            toObject: jest.fn().mockReturnValue({ name: "New Name" }),
        };
        mockAuditorFindById.mockResolvedValue(fakeAuditor);

        await updateAuditorProfile(req, res);

        expect(mockAuditorFindById).toHaveBeenCalledWith("user123");
        expect(fakeAuditor.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("returns 404 if auditor is not found", async () => {
        const req = {
            body: { name: "New Name" },
            auditor: { _id: "nonexistent" },
        };
        const res = makeRes();

        mockAuditorFindById.mockResolvedValue(null);

        await updateAuditorProfile(req, res);

        expect(mockAuditorFindById).toHaveBeenCalledWith("nonexistent");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Auditor not found" })
        );
    });
});
