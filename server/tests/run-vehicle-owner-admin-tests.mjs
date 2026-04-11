import assert from "node:assert/strict";
import sqldb from "../config/sqldatabase.js";
import {
    createVehicleOwner,
    getVehicleOwnerDetail,
    getVehicleOwnerSummary,
} from "../services/vehicleOwnerAdminService.js";

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

async function testOwnerSummaryHappyPath() {
    await withMockedQuery(async (sql) => {
        const normalized = String(sql);
        if (normalized.includes("AS total_owners")) {
            return [[{
                total_owners: 12,
                active_owners: 9,
                pending_verification_owners: 2,
                verified_owners: 6,
            }], []];
        }
        throw new Error(`Unexpected SQL in summary test: ${normalized.slice(0, 120)}`);
    }, async () => {
        const result = await getVehicleOwnerSummary({ page: 1, limit: 10 });
        assert.equal(result.totalOwners, 12);
        assert.equal(result.activeOwners, 9);
        assert.equal(result.pendingVerificationOwners, 2);
        assert.equal(result.verifiedOwners, 6);
    });
}

async function testOwnerDetailInvalidInput() {
    let thrown = false;
    try {
        await getVehicleOwnerDetail("abc");
    } catch (error) {
        thrown = true;
        assert.equal(error.code, "INVALID_OWNER_ID");
    }
    assert.equal(thrown, true);
}

async function testCreateOwnerConflictEmail() {
    await withMockedQuery(async (sql) => {
        const normalized = String(sql);
        if (normalized.includes("FROM vehicle_owners") && normalized.includes("WHERE email = ?")) {
            return [[{ owner_id: 88 }], []];
        }
        if (normalized.includes("FROM vehicle_owners") && normalized.includes("WHERE phone = ?")) {
            return [[{ owner_id: 99 }], []];
        }
        throw new Error(`Unexpected SQL in conflict test: ${normalized.slice(0, 120)}`);
    }, async () => {
        let thrown = false;
        try {
            await createVehicleOwner({
                fullname: "Owner Test",
                phone: "0986123000",
                email: "owner.test@example.com",
                commission_rate: 15,
            });
        } catch (error) {
            thrown = true;
            assert.equal(error.code, "EMAIL_ALREADY_USED");
        }
        assert.equal(thrown, true);
    });
}

const tests = [
    ["vehicle owner summary happy path", testOwnerSummaryHappyPath],
    ["vehicle owner detail invalid input", testOwnerDetailInvalidInput],
    ["create vehicle owner conflict email", testCreateOwnerConflictEmail],
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

console.log("Vehicle owner admin tests passed.");
process.exit(0);

