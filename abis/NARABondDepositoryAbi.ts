export const NARABondDepositoryAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "buyer", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "payout", type: "uint256" }
    ],
    name: "BondCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "CapacityAdded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "ExcessReturnedToVault",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "account", type: "address" }
    ],
    name: "Paused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "account", type: "address" }
    ],
    name: "Unpaused",
    type: "event"
  }
] as const;
