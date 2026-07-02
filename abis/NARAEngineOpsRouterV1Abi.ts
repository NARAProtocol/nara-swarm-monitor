export const NARAEngineOpsRouterV1Abi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "caller", type: "address" },
      { indexed: true, name: "configHash", type: "bytes32" },
      { indexed: false, name: "executableAt", type: "uint64" },
    ],
    name: "EngineConfigProposedObserved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "caller", type: "address" },
      { indexed: true, name: "stagedEpoch", type: "uint64" },
    ],
    name: "EngineConfigStagedObserved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "caller", type: "address" }],
    name: "EngineConfigCancelledObserved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "caller", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "TreasuryEthFeesWithdrawnObserved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "caller", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "trackedEmissionReserveAfter", type: "uint256" },
    ],
    name: "EmissionReserveDepositedObserved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "caller", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "trackedEmissionReserveAfter", type: "uint256" },
    ],
    name: "EmissionReserveSyncedObserved",
    type: "event",
  },
] as const;
