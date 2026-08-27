import { createPublicClient, http, isAddress } from "viem";
import { base } from "viem/chains";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { notifiersForEnv, routeNotification } from "./notificationRuntime.mjs";
import {
  buildEpochHealthReport,
  classifyEpochHealth,
  parseBacklogLimit,
  parseCriticalBacklog,
} from "./epochHealthRuntime.mjs";
import { decideEpochNotification, parsePositiveSeconds } from "./epochSentinelRuntime.mjs";
import { configuredRpcUrls, withRpcFailover } from "./rpcFailoverRuntime.mjs";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const engineAddress = requiredEnv("V4_ENGINE");
if (!isAddress(engineAddress)) throw new Error("V4_ENGINE must be a valid address");

const configuredChainId = Number(process.env.CHAIN_ID || "8453");
if (configuredChainId !== base.id) throw new Error(`epoch health supports Base chain ID ${base.id}`);

// Temporary minimal read fragment from the generated active-v4 NARAEngine ABI.
// The full generated ABI remains the release authority at abis/NARAEngineAbi.ts.
const epochReadAbi = [
  { type: "function", name: "currentEpoch", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "epochState", stateMutability: "view", inputs: [], outputs: [{ name: "epoch", type: "uint64" }] },
];

const { value: observation, providerIndex } = await withRpcFailover(
  configuredRpcUrls(process.env),
  async (rpcUrl) => {
    const client = createPublicClient({ chain: base, transport: http(rpcUrl, { timeout: 30_000 }) });
    const blockNumber = await client.getBlockNumber();
    const chainId = await client.getChainId();
    if (chainId !== configuredChainId) {
      throw new Error(`RPC chain ID ${chainId} does not match CHAIN_ID ${configuredChainId}`);
    }
    const [currentEpoch, settledEpoch, block] = await Promise.all([
      client.readContract({ address: engineAddress, abi: epochReadAbi, functionName: "currentEpoch", blockNumber }),
      client.readContract({ address: engineAddress, abi: epochReadAbi, functionName: "epochState", blockNumber }),
      client.getBlock({ blockNumber }),
    ]);
    return { block, blockNumber, chainId, currentEpoch, settledEpoch };
  },
);
if (providerIndex > 0) {
  console.warn(`Epoch sentinel used configured Base RPC fallback ${providerIndex} after earlier provider failure.`);
}

const { block, blockNumber, chainId, currentEpoch, settledEpoch } = observation;
const maxBacklog = parseBacklogLimit(process.env.V4_MAX_EPOCH_BACKLOG || "1");
const criticalBacklog = parseCriticalBacklog(process.env.V4_EPOCH_CRITICAL_BACKLOG || "5");
const health = classifyEpochHealth(currentEpoch, settledEpoch, maxBacklog, criticalBacklog);
const report = buildEpochHealthReport(health, {
  chainId,
  blockNumber,
  engineAddress,
  createdAt: Number(block.timestamp),
});

const sentinelMode = process.argv.includes("--sentinel");
const now = Math.floor(Date.now() / 1000);
const cooldownSeconds = parsePositiveSeconds(
  process.env.EPOCH_ALERT_REPEAT_SECONDS,
  "EPOCH_ALERT_REPEAT_SECONDS",
  1800,
  60,
);
const statePath = join(tmpdir(), "nara-v4-epoch-sentinel-state.json");
let previous;
if (sentinelMode) {
  try {
    previous = JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    previous = undefined;
  }
}
const decision = sentinelMode
  ? decideEpochNotification(previous, health.status, now, cooldownSeconds)
  : { notify: true, force: false, reason: "manual" };

console.log(
  `Epoch sentinel: status=${health.status} backlog=${health.backlog} block=${blockNumber} notification=${decision.reason}`,
);

let deliveries = [];
if (decision.notify) {
  const notificationEnv = decision.force
    ? { ...process.env, FORCE_NOTIFY: "true" }
    : process.env;
  deliveries = await routeNotification(report, {
    env: notificationEnv,
    notifiers: notifiersForEnv(notificationEnv),
    previousDeliveries: [],
    createdAt: Number(block.timestamp),
  });
}

const failedDeliveries = deliveries.filter(({ status }) => status === "failed");
if (failedDeliveries.length > 0) {
  throw new Error(`epoch health notification failed for ${failedDeliveries.map(({ channel }) => channel).join(", ")}`);
}

if (sentinelMode) {
  await writeFile(statePath, JSON.stringify({
    status: health.status,
    lastNotifiedAt: decision.notify ? now : Number(previous?.lastNotifiedAt || 0),
  }), { encoding: "utf8", mode: 0o600 });
}
