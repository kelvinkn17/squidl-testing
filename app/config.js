export const OLD_CHAINS = {
  mainnet: [
    {
      id: 1,
      isTestnet: false,
      name: "Ethereum Mainnet",
      chainlistUrl: "https://chainlist.org/chain/1",
      rpcUrl: "https://sepolia.infura.io/v3/0be86a45a4c3431398571a7c81165708",
      nativeToken: "ETH",
      blockExplorerUrl: "https://etherscan.io",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
      nativeTokenData: {
        name: "Ethereum",
        symbol: "ETH",
        logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
        originalChainId: 1,
        wrappedTokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    },
    {
      id: 137,
      name: "Polygon Mainnet",
      isTestnet: false,
      chainlistUrl: "https://chainlist.org/chain/137",
      rpcUrl:
        "https://polygon-mainnet.infura.io/v3/0be86a45a4c3431398571a7c81165708",
      nativeToken: "MATIC",
      blockExplorerUrl: "https://polygonscan.com",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/matic.svg",
      nativeTokenData: {
        name: "Polygon",
        symbol: "POL",
        logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/matic.svg",
        originalChainId: 137,
        wrappedTokenAddress: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
      }
    },
  ],
  testnet: [
    {
      id: 11155111,
      isTestnet: true,
      name: "Ethereum Sepolia",
      chainlistUrl: "https://chainlist.org/chain/11155111",
      rpcUrl: "https://sepolia.infura.io/v3/0be86a45a4c3431398571a7c81165708",
      nativeToken: "ETH",
      blockExplorerUrl: "https://sepolia.etherscan.io/",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
      nativeTokenData: {
        name: "Ethereum",
        symbol: "ETH",
        logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
        originalChainId: 1,
        wrappedTokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      }
    },
    {
      id: 23295,
      isTestnet: true,
      name: "Oasis Sapphire Testnet",
      chainlistUrl: "https://chainlist.org/chain/23295",
      rpcUrl: "https://testnet.sapphire.oasis.io",
      nativeToken: "TEST",
      blockExplorerUrl: "https://explorer.oasis.io/testnet/sapphire",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      compatibility: [137],
      nativeTokenData: {
        name: "Test Oasis",
        symbol: "TEST",
        logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      }
    }
  ],
  oasis: {
    mainnet: {
      id: 23294,
      isTestnet: false,
      name: "Oasis Sapphire Mainnet",
      chainlistUrl: "https://chainlist.org/chain/23294",
      rpcUrl: "https://sapphire.oasis.io",
      nativeToken: "ROSE",
      blockExplorerUrl: "https://explorer.oasis.io/mainnet/sapphire",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      compatibility: [137],
      nativeTokenData: {
        name: "ROSE",
        symbol: "ROSE",
        logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      }
    },
    testnet: {
      id: 23295,
      isTestnet: true,
      name: "Oasis Sapphire Testnet",
      chainlistUrl: "https://chainlist.org/chain/23295",
      rpcUrl: "https://testnet.sapphire.oasis.io",
      nativeToken: "TEST",
      blockExplorerUrl: "https://explorer.oasis.io/testnet/sapphire",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      compatibility: [137],
      nativeTokenData: {
        name: "Test Oasis",
        symbol: "TEST",
        logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      }
    },
  },
};

export const CHAINS = [
  /* --------------------------------- Testnet -------------------------------- */
  {
    id: 11155111,
    isTestnet: true,
    name: "Ethereum Sepolia",
    chainlistUrl: "https://chainlist.org/chain/11155111",
    rpcUrl: "https://sepolia.infura.io/v3/0be86a45a4c3431398571a7c81165708",
    nativeToken: "ETH",
    blockExplorerUrl: "https://sepolia.etherscan.io/",
    imageUrl:
      "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
    nativeTokenData: {
      name: "Ethereum",
      symbol: "ETH",
      logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
      originalChainId: 1,
      wrappedTokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    }
  },
  {
    id: 23295,
    isTestnet: true,
    name: "Oasis Sapphire Testnet",
    chainlistUrl: "https://chainlist.org/chain/23295",
    rpcUrl: "https://testnet.sapphire.oasis.io",
    nativeToken: "TEST",
    blockExplorerUrl: "https://explorer.oasis.io/testnet/sapphire",
    imageUrl:
      "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
    compatibility: [137],
    nativeTokenData: {
      name: "Test Oasis",
      symbol: "TEST",
      logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      originalChainId: 23294,
      wrappedTokenAddress: "0x21c718c22d52d0f3a789b752d4c2fd5908a8a733",
    }
  },
  /* --------------------------------- Mainnet -------------------------------- */
  {
    id: 1,
    isTestnet: false,
    name: "Ethereum Mainnet",
    chainlistUrl: "https://chainlist.org/chain/1",
    rpcUrl: "https://mainnet.infura.io/v3/0be86a45a4c3431398571a7c81165708",
    nativeToken: "ETH",
    blockExplorerUrl: "https://etherscan.io",
    imageUrl:
      "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
    nativeTokenData: {
      name: "Ethereum",
      symbol: "ETH",
      logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
      originalChainId: 1,
      wrappedTokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    }
  },
  {
    id: 137,
    name: "Polygon Mainnet",
    isTestnet: false,
    chainlistUrl: "https://chainlist.org/chain/137",
    rpcUrl:
      "https://polygon-mainnet.infura.io/v3/0be86a45a4c3431398571a7c81165708",
    nativeToken: "MATIC",
    blockExplorerUrl: "https://polygonscan.com",
    imageUrl:
      "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/matic.svg",
    nativeTokenData: {
      name: "Polygon",
      symbol: "POL",
      logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/matic.svg",
      originalChainId: 137,
      wrappedTokenAddress: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
    }
  },
  {
    id: 23294,
    isTestnet: false,
    name: "Oasis Sapphire Mainnet",
    chainlistUrl: "https://chainlist.org/chain/23294",
    rpcUrl: "https://sapphire.oasis.io",
    nativeToken: "ROSE",
    blockExplorerUrl: "https://explorer.oasis.io/mainnet/sapphire",
    imageUrl:
      "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
    compatibility: [137],
    nativeTokenData: {
      name: "ROSE",
      symbol: "ROSE",
      logo: "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      originalChainId: 23294,
      wrappedTokenAddress: "0x21c718c22d52d0f3a789b752d4c2fd5908a8a733",
    }
  },
]

export const ALLOWED_CHAIN_IDS = [1, 137];
