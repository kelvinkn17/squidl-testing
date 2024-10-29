export function aggregateBalances(data) {
  const aggregatedBalances = {
    native: {},
    erc20: {}
  };

  data.forEach(wallet => {
    // Process native token balances
    wallet.nativeBalances.forEach(native => {
      const { chainId, nativeToken, logo, balance } = native;
      const key = `${chainId}_${nativeToken}`;

      if (!aggregatedBalances.native[key]) {
        aggregatedBalances.native[key] = {
          chainId,
          balance: 0,
          nativeToken,
          logo
        };
      }

      aggregatedBalances.native[key].balance += balance;
    });

    // Process ERC20 token balances
    wallet.erc20Balances.forEach(erc20 => {
      const { chainId, address, balance, logo, name, symbol, decimals } = erc20;
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