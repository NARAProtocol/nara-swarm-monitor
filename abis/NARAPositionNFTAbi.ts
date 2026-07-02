export const NARAPositionNFTAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "positionId", type: "uint256" },
      { indexed: true, name: "to", type: "address" }
    ],
    name: "PositionMinted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "positionId", type: "uint256" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "tier", type: "uint8" },
      { indexed: false, name: "eternal", type: "bool" }
    ],
    name: "GenesisPositionMinted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" }
    ],
    name: "Transfer",
    type: "event"
  }
] as const;
