export const CHAINS = {
  mainnet: [
    {
      id: 1,
      name: "Ethereum Mainnet",
      chainlistUrl: "https://chainlist.org/chain/1",
      rpcUrl: "https://sepolia.infura.io/v3/0be86a45a4c3431398571a7c81165708",
      nativeToken: "ETH",
      blockExplorerUrl: "https://etherscan.io",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
    },
    {
      id: 137,
      name: "Polygon Mainnet",
      chainlistUrl: "https://chainlist.org/chain/137",
      rpcUrl:
        "https://polygon-mainnet.infura.io/v3/0be86a45a4c3431398571a7c81165708",
      nativeToken: "MATIC",
      blockExplorerUrl: "https://polygonscan.com",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/matic.svg",
    },
  ],
  testnet: [
    {
      id: 11155111,
      name: "Ethereum Sepolia",
      chainlistUrl: "https://chainlist.org/chain/11155111",
      rpcUrl: "https://sepolia.infura.io/v3/0be86a45a4c3431398571a7c81165708",
      nativeToken: "ETH",
      blockExplorerUrl: "https://sepolia.etherscan.io/",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
    },
    // {
    //   id: 80002,
    //   name: "Polygon Amoy",
    //   chainlistUrl: "https://chainlist.org/chain/80002",
    //   rpcUrl: "https://rpc.ankr.com/polygon_amoy",
    //   nativeToken: "MATIC",
    //   blockExplorerUrl: "https://www.oklink.com/amoy",
    //   imageUrl:
    //     "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/ethereum.svg",
    // },
    {
      id: 23295,
      name: "Oasis Sapphire Testnet",
      chainlistUrl: "https://chainlist.org/chain/23295",
      rpcUrl: "https://testnet.sapphire.oasis.io",
      nativeToken: "TEST",
      blockExplorerUrl: "https://explorer.oasis.io/testnet/sapphire",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      compatibility: [137],
    }
  ],
  oasis: {
    mainnet: {
      id: 23294,
      name: "Oasis Sapphire Mainnet",
      chainlistUrl: "https://chainlist.org/chain/23294",
      rpcUrl: "https://sapphire.oasis.io",
      nativeToken: "ROSE",
      blockExplorerUrl: "https://explorer.oasis.io/mainnet/sapphire",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      compatibility: [137],
    },
    testnet: {
      id: 23295,
      name: "Oasis Sapphire Testnet",
      chainlistUrl: "https://chainlist.org/chain/23295",
      rpcUrl: "https://testnet.sapphire.oasis.io",
      nativeToken: "TEST",
      blockExplorerUrl: "https://explorer.oasis.io/testnet/sapphire",
      imageUrl:
        "https://filebucketz.sgp1.cdn.digitaloceanspaces.com/misc/chains/oasis.svg",
      compatibility: [137],
    },
  },
};

export const ALLOWED_CHAIN_IDS = [1, 137];
