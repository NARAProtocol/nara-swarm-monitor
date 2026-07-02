export const NARAEngineAbi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "account", type: "address" },
      { indexed: true, name: "positionId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "activationEpoch", type: "uint64" },
      { indexed: false, name: "unlockEpoch", type: "uint64" },
      { indexed: false, name: "weight", type: "uint256" }
    ],
    name: "Locked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "account", type: "address" },
      { indexed: true, name: "positionId", type: "uint256" },
      { indexed: true, name: "to", type: "address" }
    ],
    name: "Unlocked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "positionId", type: "uint256" },
      { indexed: false, name: "additionalEpochs", type: "uint64" }
    ],
    name: "Extended",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "account", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "RewardsClaimed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "account", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "TokenRewardsClaimed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "role", type: "bytes32" },
      { indexed: true, name: "account", type: "address" },
      { indexed: true, name: "sender", type: "address" }
    ],
    name: "RoleGranted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "role", type: "bytes32" },
      { indexed: true, name: "account", type: "address" },
      { indexed: true, name: "sender", type: "address" }
    ],
    name: "RoleRevoked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "parameter", type: "bytes32" },
      { indexed: false, name: "oldValue", type: "uint256" },
      { indexed: false, name: "newValue", type: "uint256" }
    ],
    name: "UintParameterSet",
    type: "event"
  }
] as const;
