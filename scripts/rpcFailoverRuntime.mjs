const RPC_KEYS = ["BASE_RPC_URL", "BASE_BACKUP_RPC_URL_1", "BASE_BACKUP_RPC_URL_2"];

export function configuredRpcUrls(env = process.env) {
  const urls = RPC_KEYS
    .map((key) => env[key]?.trim())
    .filter(Boolean);
  if (urls.length === 0) throw new Error("BASE_RPC_URL is required");
  return [...new Set(urls)];
}

export async function withRpcFailover(urls, operation) {
  for (let index = 0; index < urls.length; index += 1) {
    try {
      return { value: await operation(urls[index], index), providerIndex: index };
    } catch {}
  }
  throw new Error(`all ${urls.length} configured Base RPC providers failed`);
}
