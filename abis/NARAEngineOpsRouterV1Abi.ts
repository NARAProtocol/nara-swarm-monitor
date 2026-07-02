// Generated from active v4 Hardhat artifacts. Do not edit by hand.
// Source: ../nara-protocol-hardhat/artifacts/contracts/v4/router/NARAEngineOpsRouterV1.sol/NARAEngineOpsRouterV1.json
export const NARAEngineOpsRouterV1Abi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "engine_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "paramOperator_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "treasuryOperator_",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "OpsRouterEthRejected",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OpsRouterInvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OpsRouterNotAContract",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "OpsRouterUnauthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OpsRouterZeroAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "trackedEmissionReserveAfter",
        "type": "uint256"
      }
    ],
    "name": "EmissionReserveDepositedObserved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "trackedEmissionReserveAfter",
        "type": "uint256"
      }
    ],
    "name": "EmissionReserveSyncedObserved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "EngineConfigCancelledObserved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "configHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "executableAt",
        "type": "uint64"
      }
    ],
    "name": "EngineConfigProposedObserved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "stagedEpoch",
        "type": "uint64"
      }
    ],
    "name": "EngineConfigStagedObserved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TreasuryEthFeesWithdrawnObserved",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "ENGINE",
    "outputs": [
      {
        "internalType": "contract INARAEngineOpsRouterV1Engine",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "NARA_TOKEN",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PARAM_OPERATOR",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TREASURY_OPERATOR",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cancelConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "depositRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "executeConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "eMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "beta0Wad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "mWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "aWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "cWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "dWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "dripSplitWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "durationLinearWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "durationQuadraticWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "growthFactorWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "minBaseEmission",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxBaseEmission",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "warmupRateWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bootstrapInitialWeight",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bootstrapDecayWad",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "activationDelayEpochs",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "maxLockEpochs",
            "type": "uint64"
          }
        ],
        "internalType": "struct EngineConfig",
        "name": "cfg_",
        "type": "tuple"
      }
    ],
    "name": "proposeConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "syncEmissionReserve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "withdrawTreasuryEthFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;
