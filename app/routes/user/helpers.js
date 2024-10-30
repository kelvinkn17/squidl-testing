export function aggregateBalances(data) {
  const aggregatedBalances = {
    native: {},
    erc20: {}
  };

  data.forEach(wallet => {
    // Process native token balances
    wallet.nativeBalances.forEach(native => {
      const { chainId, nativeToken, logo, balance, priceUSD } = native;
      const key = `${chainId}_${nativeToken.symbol}`;  // Use symbol as part of key for uniqueness

      if (!aggregatedBalances.native[key]) {
        aggregatedBalances.native[key] = {
          chainId,
          balance: 0,
          nativeToken,
          logo,
          priceUSD: 0
        };
      }

      aggregatedBalances.native[key].balance += balance;
      aggregatedBalances.native[key].priceUSD = priceUSD
    });

    // Process ERC20 token balances
    wallet.erc20Balances.forEach(erc20 => {
      const { chainId, address, balance, logo, name, symbol, decimals, priceUSD } = erc20;
      const key = `${chainId}_${address}`;

      if (!aggregatedBalances.erc20[key]) {
        aggregatedBalances.erc20[key] = {
          chainId,
          address,
          balance: 0,
          logo,
          name,
          symbol,
          decimals
        };
      }

      aggregatedBalances.erc20[key].balance += balance;
      aggregatedBalances.erc20[key].priceUSD = priceUSD;
    });
  });

  // Convert the aggregated results into an array format
  const nativeResult = Object.values(aggregatedBalances.native);
  const erc20Result = Object.values(aggregatedBalances.erc20);

  return {
    native: nativeResult,
    erc20: erc20Result
  };
}
