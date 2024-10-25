import cron from "node-cron";
import { dexscreenerGetTokens } from "../lib/dexscreener/api.js";
import { sleep } from "../utils/miscUtils.js";
import { prismaClient } from "../lib/db/prisma.js";

export const tokenPriceWorker = (app, _, done) => {
  // Split tokens into batches of 30
  const chunkArray = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  const fetchTokenPrice = async () => {
    try {
      const tokens = await prismaClient.token.findMany({
        include: { chain: true },
      });

      const mainnetTokens = tokens.filter((token) => !token.chain.isTestnet);
      const testnetTokens = tokens.filter((token) => token.chain.isTestnet);

      // Handle testnet tokens: Set price to 1 USD directly
      for (const token of testnetTokens) {
        console.log(
          `Testnet token detected: ${token.address}. Setting price to 1 USD.`
        );
        await prismaClient.tokenStats.upsert({
          where: { tokenId: token.id },
          update: { priceUSD: 1.0 },
          create: { tokenId: token.id, priceUSD: 1.0 },
        });
      }

      // Handle mainnet tokens in batches of 30
      const tokenBatches = chunkArray(mainnetTokens, 30);

      for (const batch of tokenBatches) {
        const response = await dexscreenerGetTokens({
          tokenAddresses: batch.map((token) => token.address),
        });
        const pairs = response.pairs;

        for (const token of batch) {
          // Find the pair where the token appears as base or quote token
          const pair = pairs.find(
            (p) =>
              p.baseToken.address.toLowerCase() ===
                token.address.toLowerCase() ||
              p.quoteToken.address.toLowerCase() === token.address.toLowerCase()
          );

          const priceUSD = pair ? parseFloat(pair.priceUsd) : null;

          console.log(`Price USD for ${token.address}: ${priceUSD}`);

          if (priceUSD !== null) {
            await prismaClient.tokenStats.upsert({
              where: { tokenId: token.id },
              update: { priceUSD },
              create: { tokenId: token.id, priceUSD },
            });
          }
        }

        await sleep(2000);
      }

      console.log("Token prices updated successfully.");
    } catch (error) {
      console.error("Error fetching token prices:", error.message);
    }
  };

  // Schedule the worker to run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("Running token price worker...");
    await fetchTokenPrice();
  });

  done();
};
