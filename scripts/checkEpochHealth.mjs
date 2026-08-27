import { createPublicClient, http, isAddress } from "viem";
import { base } from "viem/chains";
import { notifiersForEnv, routeNotification } from "./notificationRuntime.mjs";
import { buildEpochHealthReport, classifyEpochHealth, parseBacklogLimit } from "./epochHealthRuntime.mjs";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const rpcUrl = requiredEnv("BASE_RPC_URL");
const engineAddress = requiredEnv("V4_ENGINE");
if (!isAddress(engineAddress)) throw new Error("V4_ENGINE must be a valid address");

const configuredChainId = Number(process.env.CHAIN_ID || "8453");
if (configuredChainId !== base.id) throw new Error(`epoch health supports Base chain ID ${base.id}`);

const client = createPublicClient({ chain: base, transport: http(rpcUrl, { timeout: 30_000 }) });
const blockNumber = await client.getBlockNumber();
const chainId = await client.getChainId();
if (chainId !== configuredChainId) throw new Error(`RPC chain ID ${chainId} does not match CHAIN_ID ${configuredChainId}`);

// Temporary minimal read fragment from the generated active-v4 NARAEngine ABI.
// The full generated ABI remains the release authority at abis/NARAEngineAbi.ts.
const epochReadAbi = [
  { type: "function", name: "currentEpoch", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "epochState", stateMutability: "view", inputs: [], outputs: [{ name: "epoch", type: "uint64" }] },
];

const [currentEpoch, settledEpoch] = await Promise.all([
  client.readContract({ address: engineAddress, abi: epochReadAbi, functionName: "currentEpoch", blockNumber }),
  client.readContract({ address: engineAddress, abi: epochReadAbi, functionName: "epochState", blockNumber }),
]);
const maxBacklog = parseBacklogLimit(process.env.V4_MAX_EPOCH_BACKLOG || "1");
const health = classifyEpochHealth(currentEpoch, settledEpoch, maxBacklog);
const block = await client.getBlock({ blockNumber });
const report = buildEpochHealthReport(health, {
  chainId,
  blockNumber,
  engineAddress,
  createdAt: Number(block.timestamp),
});

const deliveries = await routeNotification(report, {
  env: process.env,
  notifiers: notifiersForEnv(process.env),
  previousDeliveries: [],
  createdAt: Number(block.timestamp),
});

const failedDeliveries = deliveries.filter(({ status }) => status === "failed");
if (failedDeliveries.length > 0) {
  throw new Error(`epoch health notification failed for ${failedDeliveries.map(({ channel }) => channel).join(", ")}`);
}
