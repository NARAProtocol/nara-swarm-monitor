// Generated from active v4 Hardhat artifacts. Do not edit by hand.
// Source: ../nara-protocol-hardhat/artifacts/contracts/v4/NARAEngine.sol/NARAEngine.json
export const NARAEngineAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "admin_",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "epochLengthSeconds_",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "configChangeDelaySeconds_",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "initialBaseEmission_",
        "type": "uint256"
      },
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
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AccessControlBadConfirmation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "neededRole",
        "type": "bytes32"
      }
    ],
    "name": "AccessControlUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadySet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BatchTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ConfigExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ConfigTimelockNotElapsed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DirectEthTransferForbidden",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EpochNotReady",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EpochStale",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EthTransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientFee",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidCaller",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidConfig",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidExtension",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidToken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LockTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LockTooShort",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoActiveWeight",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoPendingConfig",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPositionOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NothingToClaim",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PositionMatured",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PositionNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PositionNotMatured",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RewardTokenNotAllowed",
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
    "inputs": [],
    "name": "SlippageExceeded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TokenNotLaunched",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooManyPositions",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Uint128Overflow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroValue",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroWeight",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "parameter",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "value",
        "type": "address"
      }
    ],
    "name": "AddressParameterSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "epoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "emission",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "distributedNara",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "distributedEth",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "weightedLockShareWad",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "stressWad",
        "type": "uint256"
      }
    ],
    "name": "EpochAdvanced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "EthRewardsQueued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "oldUnlockEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "newUnlockEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldWeight",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newWeight",
        "type": "uint256"
      }
    ],
    "name": "Extended",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "activationEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "unlockEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "weight",
        "type": "uint256"
      }
    ],
    "name": "Locked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
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
        "name": "naraAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "ethAmount",
        "type": "uint256"
      }
    ],
    "name": "RewardsClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "previousAdminRole",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "newAdminRole",
        "type": "bytes32"
      }
    ],
    "name": "RoleAdminChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
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
    "name": "TokenRewardsClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
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
        "name": "indexRayDelta",
        "type": "uint256"
      }
    ],
    "name": "TokenRewardsNotified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "parameter",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "UintParameterSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
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
        "name": "weight",
        "type": "uint256"
      }
    ],
    "name": "Unlocked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "CONFIG_CHANGE_DELAY",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DEFAULT_ADMIN_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "EPOCH_LENGTH",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "GENESIS_TIMESTAMP",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "LAUNCHER",
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
    "name": "NARA",
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
    "name": "PARAM_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TREASURY_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "accumulatedTreasuryEthFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "activeTotalWeight",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "advanceEpoch",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint64",
            "name": "epoch",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "timestamp",
            "type": "uint64"
          },
          {
            "internalType": "uint256",
            "name": "circulatingSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalLocked",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "activeTotalWeight",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "weightedLockShareWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "stressWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "betaWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "horizon",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "retentionWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "baseEmission",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "emission",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "admittedSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "distributedNara",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "distributedEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "treasuryAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "warmupFactorWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bootstrapWeight",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "heartbeat",
            "type": "uint256"
          }
        ],
        "internalType": "struct EpochSnapshot",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "maxSteps",
        "type": "uint256"
      }
    ],
    "name": "advanceEpochs",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "stepsAdvanced",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint64",
            "name": "epoch",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "timestamp",
            "type": "uint64"
          },
          {
            "internalType": "uint256",
            "name": "circulatingSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalLocked",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "activeTotalWeight",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "weightedLockShareWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "stressWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "betaWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "horizon",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "retentionWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "baseEmission",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "emission",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "admittedSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "distributedNara",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "distributedEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "treasuryAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "warmupFactorWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bootstrapWeight",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "heartbeat",
            "type": "uint256"
          }
        ],
        "internalType": "struct EpochSnapshot",
        "name": "lastSnapshot",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bondVault",
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
        "internalType": "uint256[]",
        "name": "positionIds",
        "type": "uint256[]"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "claimBatch",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "naraAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "ethAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimFeeBps",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "claimRewards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "naraAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "ethAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "claimTokenRewards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      }
    ],
    "name": "claimableRewards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "naraAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "ethAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "claimableTokenRewards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "config",
    "outputs": [
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
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentEpoch",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
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
    "name": "emissionReserve",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "epochState",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "epoch",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "timestamp",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "circulatingSupply",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalLocked",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "activeTotalWeight",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "weightedLockShareWad",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stressWad",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "betaWad",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "horizon",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "retentionWad",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "baseEmission",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "emission",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "admittedSupply",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "distributedNara",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "distributedEth",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "treasuryAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "warmupFactorWad",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bootstrapWeight",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "heartbeat",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "epochStateView",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint64",
            "name": "epoch",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "timestamp",
            "type": "uint64"
          },
          {
            "internalType": "uint256",
            "name": "circulatingSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalLocked",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "activeTotalWeight",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "weightedLockShareWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "stressWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "betaWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "horizon",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "retentionWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "baseEmission",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "emission",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "admittedSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "distributedNara",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "distributedEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "treasuryAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "warmupFactorWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bootstrapWeight",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "heartbeat",
            "type": "uint256"
          }
        ],
        "internalType": "struct EpochSnapshot",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "name": "ethIndexAtEpoch",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ethIndexRay",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
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
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "additionalEpochs",
        "type": "uint64"
      }
    ],
    "name": "extend",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      }
    ],
    "name": "getRoleAdmin",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "grantRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "hasRole",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "durationEpochs",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "minWeight",
        "type": "uint256"
      }
    ],
    "name": "lock",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lockFeeBps",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lockFeeWei",
    "outputs": [
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "durationEpochs",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "minWeight",
        "type": "uint256"
      }
    ],
    "name": "lockFor",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "durationEpochs",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "minWeight",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "lockWithPermit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "name": "naraIndexAtEpoch",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "naraIndexRay",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextPositionId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "notifyEthRewards",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "notifyTokenRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "onTransferReceived",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingConfigTimestamp",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingEthForNextEpoch",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "poke",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "stepsAdvanced",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      }
    ],
    "name": "positionOf",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "createdEpoch",
            "type": "uint64"
          },
          {
            "internalType": "uint32",
            "name": "flags",
            "type": "uint32"
          },
          {
            "internalType": "uint128",
            "name": "amount",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "weight",
            "type": "uint128"
          },
          {
            "internalType": "uint64",
            "name": "activationEpoch",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "unlockEpoch",
            "type": "uint64"
          },
          {
            "internalType": "uint128",
            "name": "tokenWeight",
            "type": "uint128"
          },
          {
            "internalType": "uint256",
            "name": "naraDebtRay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "ethDebtRay",
            "type": "uint256"
          }
        ],
        "internalType": "struct Position",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "durationEpochs",
        "type": "uint64"
      }
    ],
    "name": "previewWeight",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
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
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "callerConfirmation",
        "type": "address"
      }
    ],
    "name": "renounceRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "revokeRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rewardReserve",
    "outputs": [
      {
        "internalType": "contract INaraRewardReserve",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rewardReserveAvailable",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "name": "scheduledActivationWeight",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "name": "scheduledDeactivationWeight",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "vault_",
        "type": "address"
      }
    ],
    "name": "setBondVault",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "feeBps",
        "type": "uint16"
      }
    ],
    "name": "setClaimFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint96",
        "name": "feeWei",
        "type": "uint96"
      }
    ],
    "name": "setLockEthFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "feeBps",
        "type": "uint16"
      }
    ],
    "name": "setLockFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "reserve_",
        "type": "address"
      }
    ],
    "name": "setRewardReserve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newTreasury",
        "type": "address"
      }
    ],
    "name": "setTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint96",
        "name": "feeWei",
        "type": "uint96"
      }
    ],
    "name": "setUnlockEthFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "stagedConfigEpoch",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "tokenIndexRay",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalEthRewardsClaimed",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalEthRewardsReceived",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalEthSweptToTreasury",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalLocked",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalNaraDripClaimed",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalNaraDripPaid",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalPendingNaraRewards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "trackedEmissionReserve",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "treasury",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      }
    ],
    "name": "unlock",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "positionIds",
        "type": "uint256[]"
      }
    ],
    "name": "unlockBatch",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unlockFeeWei",
    "outputs": [
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "unlockTo",
    "outputs": [],
    "stateMutability": "payable",
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
