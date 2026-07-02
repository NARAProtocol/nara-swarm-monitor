// Generated from active v4 Hardhat artifacts. Do not edit by hand.
// Source: ../nara-protocol-hardhat/artifacts/contracts/v4/NARABondDepositoryV4NFT.sol/NARABondDepositoryV4NFT.json
export const NARABondDepositoryAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "nara_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "engine_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "vault_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "positionNft_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "admin_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "treasury_",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "adminDelaySeconds_",
        "type": "uint64"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "naraPerEthWad",
            "type": "uint256"
          },
          {
            "internalType": "uint16",
            "name": "discountBps",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "rewardSplitWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "minDepositWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxPayoutNara",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "remainingCapacityNara",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "lockDurationEpochs",
            "type": "uint64"
          },
          {
            "internalType": "uint16",
            "name": "genesisRoundId",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "genesisTierId",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "genesisRewardMultiplierBps",
            "type": "uint32"
          },
          {
            "internalType": "bool",
            "name": "genesisEternal",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct NARABondDepositoryV4NFT.BondTerms",
        "name": "initialTerms_",
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
    "name": "BondInactive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CapacityExceeded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DepositTooSmall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ECDSAInvalidSignature",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "length",
        "type": "uint256"
      }
    ],
    "name": "ECDSAInvalidSignatureLength",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "ECDSAInvalidSignatureS",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EnforcedPause",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EthTransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ExpectedPause",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientInventory",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidQuote",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRecipient",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidShortString",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTerms",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTreasury",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NaraSweepForbidden",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoPendingChange",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotAContract",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PauseRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PayoutTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PendingProposalExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PriceDelayTooShort",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PriceStale",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PriceZero",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "QuoteExpired",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "payout",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxPayout",
        "type": "uint256"
      }
    ],
    "name": "QuotePayoutExceeded",
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
    "inputs": [],
    "name": "SignedQuoteRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SlippageExceeded",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "str",
        "type": "string"
      }
    ],
    "name": "StringTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TimelockNotElapsed",
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
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "ethIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bondEthIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "payout",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "grossNara",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rewardEth",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "treasuryEth",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "lockFeeEth",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "naraPerEthWad",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "discountBps",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "lockDurationEpochs",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "genesisRoundId",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "genesisTierId",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "genesisRewardMultiplierBps",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "genesisEternal",
        "type": "bool"
      }
    ],
    "name": "BondCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newRemainingCapacity",
        "type": "uint256"
      }
    ],
    "name": "CapacityAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "EIP712DomainChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "ExcessReturnedToVault",
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
    "name": "ForeignTokenSwept",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "RewardEthFlushed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "RewardEthQueued",
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
    "inputs": [],
    "name": "TermsCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "naraPerEthWad",
            "type": "uint256"
          },
          {
            "internalType": "uint16",
            "name": "discountBps",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "rewardSplitWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "minDepositWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxPayoutNara",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "remainingCapacityNara",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "lockDurationEpochs",
            "type": "uint64"
          },
          {
            "internalType": "uint16",
            "name": "genesisRoundId",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "genesisTierId",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "genesisRewardMultiplierBps",
            "type": "uint32"
          },
          {
            "internalType": "bool",
            "name": "genesisEternal",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct NARABondDepositoryV4NFT.BondTerms",
        "name": "terms",
        "type": "tuple"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "executeAfter",
        "type": "uint64"
      }
    ],
    "name": "TermsProposed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "naraPerEthWad",
            "type": "uint256"
          },
          {
            "internalType": "uint16",
            "name": "discountBps",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "rewardSplitWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "minDepositWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxPayoutNara",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "remainingCapacityNara",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "lockDurationEpochs",
            "type": "uint64"
          },
          {
            "internalType": "uint16",
            "name": "genesisRoundId",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "genesisTierId",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "genesisRewardMultiplierBps",
            "type": "uint32"
          },
          {
            "internalType": "bool",
            "name": "genesisEternal",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct NARABondDepositoryV4NFT.BondTerms",
        "name": "terms",
        "type": "tuple"
      }
    ],
    "name": "TermsSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "TreasuryCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TreasuryEthFlushed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TreasuryEthQueued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "treasury",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "executeAfter",
        "type": "uint64"
      }
    ],
    "name": "TreasuryProposed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "treasury",
        "type": "address"
      }
    ],
    "name": "TreasurySet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Unpaused",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BOND_QUOTE_TYPEHASH",
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
    "name": "BPS",
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
    "name": "MAX_DISCOUNT_BPS",
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
    "name": "MAX_GENESIS_REWARD_MULTIPLIER_BPS",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_REWARD_SPLIT_WAD",
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
    "name": "MAX_TERMS_AGE",
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
    "name": "MIN_PRICE_DELAY",
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
    "name": "PAUSER_ROLE",
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
    "name": "PRICE_SIGNER_ROLE",
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
    "name": "TERMS_ROLE",
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
    "name": "WAD",
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
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "addCapacity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "adminDelay",
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
    "name": "availableFromVault",
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
        "internalType": "uint256",
        "name": "minNaraOut",
        "type": "uint256"
      }
    ],
    "name": "buyBond",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minNaraOut",
        "type": "uint256"
      }
    ],
    "name": "buyBondFor",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minNaraOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxNaraOut",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "deadline",
        "type": "uint64"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "buyBondForWithQuote",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "payout",
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
        "name": "minNaraOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxNaraOut",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "deadline",
        "type": "uint64"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "buyBondWithQuote",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "payout",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cancelTerms",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cancelTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "eip712Domain",
    "outputs": [
      {
        "internalType": "bytes1",
        "name": "fields",
        "type": "bytes1"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "version",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "chainId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "verifyingContract",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      },
      {
        "internalType": "uint256[]",
        "name": "extensions",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "engine",
    "outputs": [
      {
        "internalType": "contract INARAEngineV4BondNFT",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "excessNara",
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
    "name": "executeTerms",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "executeTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "flushRewardEth",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "flushTreasuryEth",
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
    "inputs": [],
    "name": "nara",
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
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
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
    "name": "pendingRewardEth",
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
    "name": "pendingTreasuryEth",
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
    "name": "pendingTreasuryTimestamp",
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
    "name": "positionNft",
    "outputs": [
      {
        "internalType": "contract INARAPositionNFTV4Bond",
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
        "components": [
          {
            "internalType": "uint256",
            "name": "naraPerEthWad",
            "type": "uint256"
          },
          {
            "internalType": "uint16",
            "name": "discountBps",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "rewardSplitWad",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "minDepositWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxPayoutNara",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "remainingCapacityNara",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "lockDurationEpochs",
            "type": "uint64"
          },
          {
            "internalType": "uint16",
            "name": "genesisRoundId",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "genesisTierId",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "genesisRewardMultiplierBps",
            "type": "uint32"
          },
          {
            "internalType": "bool",
            "name": "genesisEternal",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct NARABondDepositoryV4NFT.BondTerms",
        "name": "newTerms",
        "type": "tuple"
      }
    ],
    "name": "proposeTerms",
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
    "name": "proposeTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "ethIn",
        "type": "uint256"
      }
    ],
    "name": "quoteBond",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "payout",
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "quoteNonces",
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
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "rescueRewardEth",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "returnExcessToVault",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "sweepForeignToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "terms",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "naraPerEthWad",
        "type": "uint256"
      },
      {
        "internalType": "uint16",
        "name": "discountBps",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "rewardSplitWad",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minDepositWei",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxPayoutNara",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "remainingCapacityNara",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "lockDurationEpochs",
        "type": "uint64"
      },
      {
        "internalType": "uint16",
        "name": "genesisRoundId",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "genesisTierId",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "genesisRewardMultiplierBps",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "genesisEternal",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "termsActivatedAt",
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
    "name": "termsValidUntil",
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
    "name": "totalBondedEth",
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
    "name": "totalBondsMinted",
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
    "name": "totalNaraSold",
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
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "vault",
    "outputs": [
      {
        "internalType": "contract INARABondVaultV4NFT",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;
