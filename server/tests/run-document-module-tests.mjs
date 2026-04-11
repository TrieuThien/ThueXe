import assert from "node:assert/strict";
import sqldb from "../config/sqldatabase.js";
import {
    getDocumentDefinitions,
    listAllDocumentSubmissionsService,
    listVehicleDocumentSubmissionsService,
    reviewVehicleDocumentSubmissionService,
} from "../services/documentService.js";
import { listOwnerRequiredDocuments } from "../repositories/ownerRepository.js";

function logPass(name) {
    console.log(`PASS: ${name}`);
}

function logFail(name, error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
}

async function withMockedQuery(handler, run) {
    const originalQuery = sqldb.query.bind(sqldb);
    sqldb.query = handler;
    try {
        await run();
    } finally {
        sqldb.query = originalQuery;
    }
}

async function testDocumentDefinitionsFilterByIdHappyPath() {
    await withMockedQuery(async (sql, params) => {
        const normalized = String(sql);
        assert.match(normalized, /FROM documents/i);
        assert.match(normalized, /WHERE id = \?/i);
        assert.deepEqual(params, [7]);
        return [[{
            id: 7,
            title: "CCCD",
            doc_desc: "Giay to dinh danh",
            doc_city: null,
            doc_type: 0,
            doc_user: 2,
            doc_expiry: 0,
            doc_id_num: 1,
            doc_id_num_title: "So giay to",
            doc_id_num_desc: "Nhap so",
            status: 1,
            date_created: "2026-01-01 00:00:00",
        }], []];
    }, async () => {
        const result = await getDocumentDefinitions({ query: { id: "7" } });
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].id, 7);
    });
}

async function testInvalidSubmissionId() {
    let thrown = false;
    try {
        await listAllDocumentSubmissionsService({ query: { id: "0" } });
    } catch (error) {
        thrown = true;
        assert.equal(error.code, "INVALID_SUBMISSION_ID_QUERY");
    }
    assert.equal(thrown, true);
}

async function testOwnerRequiredDocsRegressionDocTypeFilter() {
    await withMockedQuery(async (sql) => {
        const normalized = String(sql).replace(/\s+/g, " ");
        assert.match(normalized, /FROM documents/i);
        assert.match(normalized, /doc_user = 2/i);
        assert.match(normalized, /doc_type = 0/i);
        return [[{
            id: 9,
            title: "CCCD",
            doc_desc: "Owner only",
            doc_expiry: 0,
            doc_id_num: 1,
            doc_id_num_title: "So CCCD",
        }], []];
    }, async () => {
        const rows = await listOwnerRequiredDocuments();
        assert.equal(rows.length, 1);
        assert.equal(rows[0].id, 9);
    });
}

async function testVehicleSubmissionsFilterByIdHappyPath() {
    await withMockedQuery(async (sql, params) => {
        const normalized = String(sql).replace(/\s+/g, " ");
        assert.match(normalized, /FROM vehicle_documents vd/i);
        assert.match(normalized, /vd\.id = \?/i);
        assert.match(normalized, /d\.doc_user = 2/i);
        assert.match(normalized, /d\.doc_type = 1/i);
        assert.deepEqual(params, [5]);
        return [[{
            id: 5,
            vehicle_id: 11,
            owner_id: 22,
            document_id: 7,
            document_title: "Dang ky xe",
            doc_city: null,
            doc_number: "ABC123",
            doc_expiry_date: "2027-01-01",
            file_url: null,
            mime_type: null,
            file_size: null,
            verified: 0,
            status: "pending",
            review_note: null,
            date_submitted: "2026-01-01 00:00:00",
            updated_at: "2026-01-01 00:00:00",
        }], []];
    }, async () => {
        const result = await listVehicleDocumentSubmissionsService({ query: { id: "5" } });
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].id, 5);
        assert.equal(result.items[0].vehicle_id, 11);
    });
}

async function testVehicleSubmissionsInvalidId() {
    let thrown = false;
    try {
        await listVehicleDocumentSubmissionsService({ query: { id: "0" } });
    } catch (error) {
        thrown = true;
        assert.equal(error.code, "INVALID_VEHICLE_SUBMISSION_ID_QUERY");
    }
    assert.equal(thrown, true);
}

async function testVehicleSubmissionReviewApprovedMapping() {
    const sqlCalls = [];
    let selectCount = 0;
    await withMockedQuery(async (sql, params) => {
        const normalized = String(sql).replace(/\s+/g, " ");
        sqlCalls.push({ normalized, params });

        if (/SELECT .* FROM vehicle_documents vd .* WHERE vd\.id = \? .* LIMIT 1/i.test(normalized)) {
            selectCount += 1;
            return [[{
                id: 15,
                vehicle_id: 30,
                owner_id: 8,
                document_id: 4,
                doc_number: "51A-99999",
                doc_expiry_date: null,
                file_url: null,
                mime_type: null,
                file_size: null,
                verified: selectCount === 1 ? 0 : 1,
                status: selectCount === 1 ? "pending" : "verified",
                review_note: selectCount === 1 ? null : "ok",
                date_submitted: "2026-02-01 00:00:00",
                updated_at: "2026-02-01 00:00:00",
            }], []];
        }
        if (/UPDATE vehicle_documents SET verified = \?, status = \?, review_note = \?, updated_at = NOW\(\) WHERE id = \? LIMIT 1/i.test(normalized)) {
            assert.deepEqual(params, [1, "verified", "ok", 15]);
            return [{ affectedRows: 1 }, undefined];
        }
        throw new Error(`Unexpected SQL: ${normalized}`);
    }, async () => {
        const result = await reviewVehicleDocumentSubmissionService({
            submissionId: 15,
            payload: { status: "approved", review_note: "ok" },
        });
        assert.equal(result.review_status, "approved");
        assert.equal(result.submission.verified, 1);
        assert.equal(result.submission.status, "verified");
    });

    const selectCalls = sqlCalls.filter((call) => /FROM vehicle_documents vd/i.test(call.normalized));
    assert.equal(selectCalls.length, 2);
}

async function testVehicleSubmissionsRegressionOnlyVehicleDocumentDefinitions() {
    await withMockedQuery(async (sql, params) => {
        const normalized = String(sql).replace(/\s+/g, " ");
        assert.match(normalized, /FROM vehicle_documents vd/i);
        assert.match(normalized, /INNER JOIN documents d ON d\.id = vd\.document_id/i);
        assert.match(normalized, /d\.doc_user = 2/i);
        assert.match(normalized, /d\.doc_type = 1/i);
        assert.deepEqual(params, []);
        return [[], []];
    }, async () => {
        const result = await listVehicleDocumentSubmissionsService({ query: {} });
        assert.deepEqual(result.items, []);
    });
}

const tests = [
    ["document definitions filter by id happy path", testDocumentDefinitionsFilterByIdHappyPath],
    ["document submissions invalid id", testInvalidSubmissionId],
    ["owner required docs only personal doc_type=0", testOwnerRequiredDocsRegressionDocTypeFilter],
    ["vehicle submissions filter by id happy path", testVehicleSubmissionsFilterByIdHappyPath],
    ["vehicle submissions invalid id", testVehicleSubmissionsInvalidId],
    ["vehicle submission review approved mapping", testVehicleSubmissionReviewApprovedMapping],
    ["vehicle submissions only doc_type=1 and doc_user=2", testVehicleSubmissionsRegressionOnlyVehicleDocumentDefinitions],
];

let failed = 0;

for (const [name, run] of tests) {
    try {
        await run();
        logPass(name);
    } catch (error) {
        failed += 1;
        logFail(name, error);
    }
}

if (failed > 0) {
    console.error(`Tests failed: ${failed}`);
    process.exit(1);
}

console.log("Document module tests passed.");
process.exit(0);
