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
      { indexed: true, name: "role", type: "bytes32" },
      { indexed: true, name: "previousAdminRole", type: "bytes32" },
      { indexed: true, name: "newAdminRole", type: "bytes32" }
    ],
    name: "RoleAdminChanged",
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
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "parameter", type: "bytes32" },
      { indexed: false, name: "oldValue", type: "address" },
      { indexed: false, name: "newValue", type: "address" }
    ],
    name: "AddressParameterSet",
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
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "implementation", type: "address" }
    ],
    name: "Upgraded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "previousAdmin", type: "address" },
      { indexed: false, name: "newAdmin", type: "address" }
    ],
    name: "AdminChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "EthRewardsQueued",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "TokenRewardsNotified",
    type: "event"
  },
  {
    inputs: [{ name: "newTreasury", type: "address" }],
    name: "setTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "reserve_", type: "address" }],
    name: "setRewardReserve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "vault_", type: "address" }],
    name: "setBondVault",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "feeBps", type: "uint16" }],
    name: "setLockFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "feeBps", type: "uint16" }],
    name: "setClaimFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "feeWei", type: "uint96" }],
    name: "setLockEthFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "feeWei", type: "uint96" }],
    name: "setUnlockEthFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          { name: "eMax", type: "uint256" },
          { name: "beta0Wad", type: "uint256" },
          { name: "mWad", type: "uint256" },
          { name: "aWad", type: "uint256" },
          { name: "bWad", type: "uint256" },
          { name: "cWad", type: "uint256" },
          { name: "dWad", type: "uint256" },
          { name: "dripSplitWad", type: "uint256" },
          { name: "durationLinearWad", type: "uint256" },
          { name: "durationQuadraticWad", type: "uint256" },
          { name: "growthFactorWad", type: "uint256" },
          { name: "minBaseEmission", type: "uint256" },
          { name: "maxBaseEmission", type: "uint256" },
          { name: "warmupRateWad", type: "uint256" },
          { name: "bootstrapInitialWeight", type: "uint256" },
          { name: "bootstrapDecayWad", type: "uint256" },
          { name: "activationDelayEpochs", type: "uint64" },
          { name: "maxLockEpochs", type: "uint64" }
        ],
        name: "cfg_",
        type: "tuple"
      }
    ],
    name: "proposeConfig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "executeConfig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "cancelConfig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "to", type: "address" }],
    name: "withdrawTreasuryEthFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;
