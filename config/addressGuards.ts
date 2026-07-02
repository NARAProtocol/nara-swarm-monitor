const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const RETIRED_ADDRESSES = new Set(
  [
    // Retired v3 stack.
    "0xE444de61752bD13D1D37Ee59c31ef4e489bd727C", // NARATokenV3
    "0x62250aEE40F37e2eb2cd300E5a429d7096C8868F", // NARAEngineV2
    "0xC425F45f3e108cA4E49f86E01C6d256e6c572876", // v3 reward reserve
    "0xcCe364b9cF815D47B0338aAd960367CdE8E3525D", // v3 bond vault
    "0xe5f3D18d81661F63F9Fa5B53401eee08d383Ca20", // v3 bond depository
    "0x81573dEDa5BcED23f0754cf3D0D2553d3694a0Ba", // v3 lotto
    "0x6a1d3f01EFB35F3A8d5d6B3101f2764Bdf47cf3b", // v3 arena
    "0x2654602d8b0A7e328dcEC553aC2d1D289fC3B5da", // v3 lock NFT
    "0x255770CA9D2b69ef766cF2755276051a6D21D131", // v3 lock account
    "0x7FDbA2DB4C46d69216f2166aA7f2CED403d97885", // v3 lock renderer

    // Retired v4 incident stack. Historical/recovery only, never monitor default.
    "0x58c209B95350aFBEFa17137CEd209f8c4b7D896D", // incident NARAToken v4
    "0x9E8cE51805b13a4d75c324F75B06ABc00d9b1E03", // incident NARAEngine v4
    "0x58C3f6E6b005009B775C0912B003D39660D14391", // incident liquidity vault
    "0x86ED92166aF1f97Fba75A9b12D9b1F7FfEE5E088", // incident liquidity hook
  ].map((address) => address.toLowerCase()),
);

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Use the fresh v4 redeploy value; no fallback addresses are allowed.`);
  }
  return value;
}

function assertAddress(name: string, value: string): asserts value is `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} must be a 20-byte EVM address.`);
  }

  const normalized = value.toLowerCase();
  if (normalized === ZERO_ADDRESS) {
    throw new Error(`${name} cannot be the zero address.`);
  }

  if (RETIRED_ADDRESSES.has(normalized)) {
    throw new Error(`${name} points to a retired NARA address. Fresh v4 redeploy addresses only.`);
  }
}

export function requireFreshV4Address(name: string): `0x${string}` {
  const value = requireEnv(name);
  assertAddress(name, value);
  return value;
}

export function requireFreshStartBlock(): number {
  const raw = requireEnv("V4_START_BLOCK");
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("V4_START_BLOCK must be a positive integer from the fresh v4 deployment.");
  }
  return value;
}
