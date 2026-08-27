import assert from "node:assert/strict";
import { decideEpochNotification, parsePositiveSeconds } from "./epochSentinelRuntime.mjs";
import { configuredRpcUrls, withRpcFailover } from "./rpcFailoverRuntime.mjs";

assert.equal(parsePositiveSeconds(undefined, "INTERVAL", 300, 60), 300);
assert.equal(parsePositiveSeconds("60", "INTERVAL", 300, 60), 60);
assert.throws(() => parsePositiveSeconds("59", "INTERVAL", 300, 60), /at least 60/);

assert.deepEqual(decideEpochNotification(undefined, "GREEN", 1000, 1800), {
  notify: false, force: false, reason: "initial",
});
assert.equal(decideEpochNotification(undefined, "RED", 1000, 1800).notify, true);
assert.equal(decideEpochNotification({ status: "YELLOW", lastNotifiedAt: 900 }, "RED", 1000, 1800).notify, true);
assert.deepEqual(decideEpochNotification({ status: "RED", lastNotifiedAt: 900 }, "GREEN", 1000, 1800), {
  notify: true, force: true, reason: "recovered",
});
assert.equal(decideEpochNotification({ status: "RED", lastNotifiedAt: 900 }, "RED", 1000, 1800).notify, false);
assert.equal(decideEpochNotification({ status: "RED", lastNotifiedAt: 900 }, "RED", 2700, 1800).notify, true);

assert.deepEqual(configuredRpcUrls({
  BASE_RPC_URL: "https://primary.invalid",
  BASE_BACKUP_RPC_URL_1: "https://backup.invalid",
  BASE_BACKUP_RPC_URL_2: "https://backup.invalid",
}), ["https://primary.invalid", "https://backup.invalid"]);

const attempts = [];
const failover = await withRpcFailover(["primary", "backup"], async (url) => {
  attempts.push(url);
  if (url === "primary") throw new Error("unavailable");
  return "ok";
});
assert.deepEqual(attempts, ["primary", "backup"]);
assert.deepEqual(failover, { value: "ok", providerIndex: 1 });
let failoverError;
try {
  await withRpcFailover(["secret-primary-url", "secret-backup-url"], async () => {
    throw new Error("provider failure containing secret-primary-url");
  });
} catch (error) {
  failoverError = error;
}
assert.match(failoverError.message, /all 2 configured Base RPC providers failed/);
assert.doesNotMatch(failoverError.stack, /secret-primary-url|secret-backup-url/);

console.log("epoch sentinel runtime tests passed");
