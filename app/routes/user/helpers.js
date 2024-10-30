import { Contract, ethers, JsonRpcProvider } from "ethers";
import { CHAINS } from "../../config.js";
import { prismaClient } from "../../lib/db/prisma.js";
import { erc20Abi } from "viem";

export function aggregateBalances(data) {
  const aggregatedBalances = {
    native: {},
    erc20: {},
  };

  data.forEach((wallet) => {
    // Process native token balances
    wallet.nativeBalances.forEach((native) => {
      const {
        chainId,
        nativeToken,
        logo,
        balance,
        priceUSD,
        chainName,
        chainLogo,
      } = native;
      const key = `${chainId}_${nativeToken.symbol}`; // Use symbol as part of key for uniqueness

      if (!aggregatedBalances.native[key]) {
        aggregatedBalances.native[key] = {
          chainId,
          chainName,
          chainLogo,
          nativeToken,
          logo,
          balance: 0,
          priceUSD: 0,
        };
      }

      aggregatedBalances.native[key].balance += balance;
      aggregatedBalances.native[key].priceUSD += priceUSD;
    });

    // Process ERC20 token balances
    wallet.erc20Balances.forEach((erc20) => {
      const {
        chainId,
        address,
        balance,
        logo,
        name,
        symbol,
        decimals,
        priceUSD,
        chainName,
        chainLogo,
      } = erc20;
      const key = `${chainId}_${address}`;

      if (!aggregatedBalances.erc20[key]) {
        aggregatedBalances.erc20[key] = {
          chainId,
          chainLogo,
          address,
          balance: 0,
          logo,
          name,
          symbol,
          decimals,
          chainName,
        };
      }

      aggregatedBalances.erc20[key].balance += balance;
      aggregatedBalances.erc20[key].priceUSD += priceUSD;
    });
  });

  const nativeResult = Object.values(aggregatedBalances.native);
  const erc20Result = Object.values(aggregatedBalances.erc20);

  const totalBalanceUSD =
    nativeResult.reduce((acc, { priceUSD }) => {
      return acc + priceUSD;
    }, 0) +
    erc20Result.reduce((acc, { priceUSD }) => {
      return acc + priceUSD;
    }, 0);

  return {
    aggregatedBalances: {
      native: nativeResult,
      erc20: erc20Result,
    },
    totalBalanceUSD,
  };
}

export async function getAliasTotalBalanceUSD(alias, username) {
  const aliasData = await prismaClient.userAlias.findFirst({
    where: { alias, user: { username } },
    include: {
      stealthAddresses: {
        where: { isTransacted: true },
        select: {
          address: true,
          transactions: {
            select: {
              chainId: true,
              isNative: true,
              token: { select: { address: true } },
            },
          },
        },
      },
    },
  });

  if (!aliasData) throw new Error("Alias not found");

  let totalBalanceUSD = 0;

  for (const stealthAddress of aliasData.stealthAddresses) {
    for (const transaction of stealthAddress.transactions.filter(
      (tx) => tx.isNative
    )) {
      const { chainId } = transaction;
      const network = CHAINS.find((chain) => chain.id === chainId);
      const provider = new JsonRpcProvider(network.rpcUrl);
      const balance = await provider.getBalance(stealthAddress.address);
      const formattedBalance = parseFloat(ethers.formatEther(balance));

      const nativeToken = await prismaClient.nativeToken.findFirst({
        where: { chainId },
        select: { priceUSD: true },
      });

      totalBalanceUSD += (nativeToken.priceUSD || 0) * formattedBalance;
    }

    for (const transaction of stealthAddress.transactions.filter(
      (tx) => !tx.isNative && tx.token?.address
    )) {
      const { chainId, token } = transaction;
      const network = CHAINS.find((chain) => chain.id === chainId);
      const provider = new JsonRpcProvider(network.rpcUrl);
      const contract = new Contract(token.address, erc20Abi, provider);
      const balance = await contract.balanceOf(stealthAddress.address);
      const formattedBalance = parseFloat(ethers.formatUnits(balance, 18));

      const tokenMetadata = await prismaClient.erc20Token.findFirst({
        where: { chainId, address: token.address },
        select: { priceUSD: true },
      });

      totalBalanceUSD += (tokenMetadata.priceUSD || 0) * formattedBalance;
    }
  }

  return totalBalanceUSD;
}
