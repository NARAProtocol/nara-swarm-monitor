export const NARABondVaultAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "depository", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "PulledToMarket",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "depository", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "ReturnedFromMarket",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "oldCap", type: "uint256" },
      { indexed: false, name: "newCap", type: "uint256" }
    ],
    name: "ReleaseCapChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "oldMarket", type: "address" },
      { indexed: true, name: "newMarket", type: "address" }
    ],
    name: "MarketChanged",
    type: "event"
  }
] as const;
