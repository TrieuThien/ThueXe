import assert from "node:assert/strict";
import requireRole from "../middlewares/roleMiddleware.js";
import { __ownerTestUtils } from "../services/ownerService.js";

let passed = 0;

function ok(name) {
  passed += 1;
  console.log(`PASS: ${name}`);
}

// Happy path: transition pending -> confirmed
__ownerTestUtils.validateBookingTransition("pending", "confirmed");
ok("owner booking transition happy path");

// Invalid transition: completed -> pending
let invalidThrown = false;
try {
  __ownerTestUtils.validateBookingTransition("completed", "pending");
} catch (error) {
  invalidThrown = true;
  assert.equal(error.code, "INVALID_STATUS_TRANSITION");
}
assert.equal(invalidThrown, true);
ok("owner booking transition invalid case");

// Forbidden RBAC: role middleware blocks non-owner
const guard = requireRole("owner");
let forbiddenError = null;
await new Promise((resolve) => {
  guard({ auth: { role: "passenger" } }, {}, (err) => {
    forbiddenError = err || null;
    resolve();
  });
});
assert.ok(forbiddenError);
assert.equal(forbiddenError.code, "FORBIDDEN");
ok("owner RBAC forbidden case");

console.log(`Owner module tests passed: ${passed}`);
