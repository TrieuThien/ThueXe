import assert from "node:assert/strict";
import sqldb from "../config/sqldatabase.js";
import { mapUserAccountTypeToRole } from "../utils/authRole.js";
import { listWalletAccounts } from "../repositories/walletRepository.js";

function logPass(name) {
  console.log(`PASS: ${name}`);
}

function logFail(name, error) {
  console.error(`FAIL: ${name}`);
  console.error(error);
}

async function testAccountTypeRoleMapping() {
  assert.equal(mapUserAccountTypeToRole(2), "dispatcher");
  assert.equal(mapUserAccountTypeToRole(3), "admin");
  assert.equal(mapUserAccountTypeToRole(5), "passenger");
}

async function testWalletAccountsUsesUsersForStaffActor() {
  const originalQuery = sqldb.query.bind(sqldb);
  const executedSql = [];

  sqldb.query = async (sql, params) => {
    executedSql.push(String(sql));

    if (String(sql).includes("COUNT(*) AS total_items")) {
      return [[{ total_items: 1 }], []];
    }

    return [[{
      wallet_id: 101,
      actor_type: 3,
      actor_id: 7,
      currency_id: 1,
      currency_code: "VND",
      currency_symbol: "d",
      balance: 120000,
      status: 1,
      created_at: "2026-04-04 00:00:00",
      user_name: null,
      user_phone: null,
      driver_name: null,
      driver_phone: null,
      owner_name: null,
      owner_phone: null,
      staff_name: "Admin One",
      staff_phone: "+84901234567",
    }], []];
  };

  try {
    const result = await listWalletAccounts({ search: "admin", page: 1, limit: 10 });

    const joinedSql = executedSql.join("\n");
    assert.equal(joinedSql.includes("LEFT JOIN staffs"), false);
    assert.equal(
      joinedSql.includes("LEFT JOIN users su ON wa.actor_type = 3 AND su.user_id = wa.actor_id AND su.account_type IN (2, 3)"),
      true
    );
    assert.equal(result.items[0].actor_name, "Admin One");
    assert.equal(result.items[0].actor_phone, "+84901234567");
  } finally {
    sqldb.query = originalQuery;
  }
}

const tests = [
  ["account_type to role mapping", testAccountTypeRoleMapping],
  ["wallet accounts query uses users for actor_type 3", testWalletAccountsUsesUsersForStaffActor],
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

console.log("Admin refactor tests passed.");
process.exit(0);
