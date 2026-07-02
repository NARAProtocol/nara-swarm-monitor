export const NARAOpsVaultAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "Funded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "Withdrawn",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "previousOwner", type: "address" },
      { indexed: true, name: "newOwner", type: "address" }
    ],
    name: "OwnershipTransferred",
    type: "event"
  }
] as const;
