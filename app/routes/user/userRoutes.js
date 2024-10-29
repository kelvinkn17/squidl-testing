import { prismaClient } from "../../lib/db/prisma.js";
import { authMiddleware } from "../../lib/middlewares/authMiddleware.js";
import { oneInchApi } from "../../lib/1inch/api.js";
import { sleep } from "../../utils/miscUtils.js";
import { moralisApi } from "../../lib/moralis/api.js";
import { toHex } from "viem";
import { ALLOWED_CHAIN_IDS } from "../../config.js";
import { verifyFields } from "../../utils/request.js";

/**
 *
 * @param {import("fastify").FastifyInstance} app
 * @param {*} _
 * @param {*} done
 */
export const userRoutes = (app, _, done) => {
  app.get("/share-identity", async (req, reply) => {
    const userPaymentUrl = "https://bozo.squidl.me/0x6e892x782y2rx";

    return {
      userPaymentUrl,
    };
  });

  app.get("/alias", { preHandler: [authMiddleware] }, async (req, reply) => {
    const { address } = req.user;
    try {
      const userAliases = await prismaClient.userAlias.findMany({
        where: {
          user: {
            address,
          },
        },
      });
      return reply.send({
        message: "Success getting all user aliases data",
        data: userAliases,
      });
    } catch (e) {
      console.log("error getting aliases");
      return reply.status(500).send({
        message: "Error getting alias",
      });
    }
  });
  app.post(
    "/update-alias",
    { preHandler: [authMiddleware] },
    async (req, reply) => {
      const { alias } = req.body;

      console.log({ alias });

      const { address } = req.user;

      console.log({ address });
      try {
        const existingAliases = await prismaClient.userAlias.findMany({
          where: {
            alias,
          },
        });

        if (existingAliases && existingAliases.length === 0) {
          return reply
            .send({
              message: "Alias already exist",
            })
            .status(400);
        }

        const userAlias = await prismaClient.userAlias.update({
          where: {
            user: {
              address,
            },
          },
          data: {
            alias: alias,
          },
        });

        return {
          message: "User alias has been updated",
          data: userAlias,
        };
      } catch (e) {
        console.log("Error updating user alias");
        return reply.status(500).send({
          message: "Error updating alias",
        });
      }
    }
  );

  app.post(
    "/update-user",
    { preHandler: [authMiddleware] },
    async (req, reply) => {
      await verifyFields(req.body, ["username"], reply);

      const { username, metaAddressInfo } = req.body;

      const { address } = req.user;

      try {
        const existingUser = await prismaClient.user.findFirst({
          where: {
            username,
          },
        });

        if (existingUser) {
          return reply
            .send({
              message: "Alias already exist",
            })
            .status(400);
        }

        const user = await prismaClient.user.findFirst({
          where: {
            wallet: {
              address,
            },
          },
        });

        // const updatedUser = await prismaClient.user.update({
        //   where: {
        //     id: user.id,
        //   },
        //   data: {
        //     username,
        //   },
        // });

        // // Update user alias meta address info
        // const updatedAlias = await prismaClient.userAlias.update({
        //   where: {
        //     userId_alias: {
        //       userId: user.id,
        //       alias: ""
        //     }
        //   },
        //   data: {
        //     metaAddress: metaAddressInfo.metaAddress,
        //     spendPublicKey: metaAddressInfo.spendPublicKey,
        //     viewingPublicKey: metaAddressInfo.viewingPublicKey,
        //   }
        // })

        // Make update atomic
        const [updatedUser, updatedAlias] = await prismaClient.$transaction([
          prismaClient.user.update({
            where: {
              id: user.id,
            },
            data: {
              username: username,
              metaAddress: metaAddressInfo.metaAddress,
              spendPublicKey: metaAddressInfo.spendPublicKey,
              viewingPublicKey: metaAddressInfo.viewingPublicKey,
            },
          })
        ]);

        console.log({ updatedUser, updatedAlias });

        return {
          message: "User alias has been updated",
          data: updatedUser,
        };
      } catch (e) {
        console.log("Error updating user alias", e);
        return reply.status(500).send({
          message: "Error updating alias",
        });
      }
    }
  );

  // TODO Optimize grouping, db saving, querying, etc.
  app.get(
    "/wallet-assets",
    // Enable later
    // { preHandler: [authMiddleware] },
    async function (req, reply) {
      const { id } = req.query;

      // Enable later
      // const { id, address } = req.user;
      if (!id) {
        return reply.status(400).send({
          message: "User id is required",
        });
      }

      try {
        const user = await prismaClient.user.findUnique({
          where: {
            id: id,
          },
        });

        if (!user) {
          return reply.status(404).send({
            message: "User not found",
          });
        }

        // TODO Replace with real user address
        const mainAddress = "0xE55f467EDF9cf38379cea2f19ae3d2Aaf6ecFb0B";

        // TODO use real stealth addresses from user
        const stealthAddresses = [];

        const allAddresses = [mainAddress, ...stealthAddresses];

        const { data: portfolioData } = await oneInchApi.get(
          `/portfolio/portfolio/v4/overview/erc20/current_value`,
          {
            params: {
              addresses: allAddresses,
            },
            paramsSerializer: {
              indexes: null,
            },
          }
        );

        // STEP 1 get value
        const totalBalanceUsd = portfolioData.result.filter(
          (data) =>
            data.protocol_name === "native" || data.protocol_name === "token"
        )
          ? portfolioData.result
            .filter(
              (data) =>
                data.protocol_name === "native" ||
                data.protocol_name === "token"
            )
            .flatMap((data) => data.result)
            .filter((data) => ALLOWED_CHAIN_IDS.includes(data.chain_id))
            .reduce((acc, curr) => {
              return acc + parseFloat(curr.value_usd);
            }, 0)
          : 0;

        const tokens = [];

        // STEP 2 get token details
        for (const chain of ALLOWED_CHAIN_IDS) {
          for (const address of allAddresses) {
            const { data: tokenData } = await moralisApi.get(
              `/wallets/${address}/tokens?chain=${toHex(chain)}`
            );

            const token = tokenData.result.map((token) => {
              return {
                token_address: token.token_address,
                symbol: token.symbol,
                name: token.name,
                logo: token.logo,
                balance: token.balance,
                decimals: token.decimals,
                usd_value: token.usd_value,
                native_token: token.native_token,
                chainId: chain,
              };
            });

            tokens.push(...token);

            await sleep(100);
          }
        }

        // STEP 3 save token data to db
        for (const token of tokens) {
          const existingToken = await prismaClient.token.findFirst({
            where: {
              address: token.token_address,
            },
          });

          if (!existingToken) {
            await prismaClient.token.create({
              data: {
                address: token.token_address,
                symbol: token.symbol,
                name: token.name,
                logo: token.logo,
                decimals: token.decimals,
                chain: {
                  connect: {
                    id: token.chainId,
                  },
                },
              },
            });
          }
        }

        await sleep(1000);

        //STEP 4 get chart data
        const { data: balanceChartData } = await oneInchApi.get(
          `/portfolio/portfolio/v4/general/value_chart?addresses=${mainAddress}&chain_id=1&timerange=1day`
        );

        const result = {
          totalBalanceUsd,
          tokens,
          balanceChartData: balanceChartData.result,
        };

        return reply.send({
          message: "Success getting user wallet assets",
          data: result,
        });
      } catch (e) {
        console.log("Error getting wallet assets", e);
        return reply.status(500).send({
          message: "Error getting wallet assets",
        });
      }
    }
  );

  // TODO use real stealth addresses from user
  // app.get(
  //   "/wallet-assets/:aliasId",
  //   // { preHandler: [authMiddleware] },
  //   async function (req, reply) {
  //     const { aliasId } = req.params;
  //     const { id } = req.user;

  //     if (!id) {
  //       return reply.status(400).send({
  //         message: "User id is required",
  //       });
  //     }

  //     try {
  //       const user = await prismaClient.user.findUnique({
  //         where: {
  //           id: id,
  //         },
  //       });

  //       if (!user) {
  //         return reply.status(404).send({
  //           message: "User not found",
  //         });
  //       }

  //       const alias = await prismaClient.userAlias.findUnique({
  //         where: { id: aliasId },
  //         include: {
  //           stealthAddresses: true,
  //         },
  //       });

  //       // TODO use real stealth addresses from user
  //       // const stealthAddresses = alias.stealthAddresses;

  //       // TODO replace with real assets

  //       const dummyTokens = [
  //         {
  //           address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  //           name: "USD Coin",
  //           symbol: "USDC",
  //           amount: 1,
  //           decimals: 6,
  //           logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  //         },
  //       ];

  //       // Fetch token price
  //       const tokensWithStats = await prismaClient.token.findMany({
  //         where: {
  //           address: { in: dummyTokens.map((token) => token.address) },
  //         },
  //         include: {
  //           stats: true,
  //         },
  //       });

  //       // Map tokens to include prices and prepare the response
  //       // TODO replace with real assets
  //       const tokenAssets = dummyTokens.map((dummyToken) => {
  //         const tokenWithStat = tokensWithStats.find(
  //           (t) => t.address === dummyToken.address
  //         );

  //         const priceUSD = tokenWithStat?.stats?.priceUSD || 1;

  //         // TODO add chain logo
  //         return {
  //           address: dummyToken.address,
  //           name: dummyToken.name,
  //           symbol: dummyToken.symbol,
  //           amount: dummyToken.amount,
  //           logo: dummyToken.logo,
  //           priceUSD,
  //           amountUSD: dummyToken.amount * priceUSD,
  //         };
  //       });

  //       const result = {
  //         tokenAssets,
  //       };

  //       return reply.send({
  //         message: "Success getting user wallet assets",
  //         data: result,
  //       });
  //     } catch (e) {
  //       console.log("Error getting wallet assets", e);
  //       return reply.status(500).send({
  //         message: "Error getting wallet assets",
  //       });
  //     }
  //   }
  // );

  app.get(
    "/wallet-assets/:fullAlias",
    // { preHandler: [authMiddleware] },
    async function (req, reply) {
      try {
        const { fullAlias } = req.params;
        const { isTestnet = true } = req.query;

        // Split the full alias to get the alias
        const aliasParts = fullAlias.split(".");
        const alias = aliasParts[aliasParts.length - 4] || "";
        const username = aliasParts[aliasParts.length - 3];

        console.log({
          alias,
          username,
        })


        const aliasData = await prismaClient.userAlias.findFirst({
          where: {
            alias: alias,
            user: {
              username: username,
            }
          },
          include: {
            stealthAddresses: {
              where: {
                isTransacted: true,
              },
              select: {
                address: true,
                ephemeralPub: true,
                viewHint: true,
                isTransacted: true,
                createdAt: true,
              }
            },
          },
        });

        if (!aliasData) {
          return reply.status(404).send({
            message: "Alias not found",
          });
        }

        const stealthAddresses = aliasData.stealthAddresses.map((address) => {
          return address.address;
        });

        const { data: portfolioData } = await oneInchApi.get(
          `/portfolio/portfolio/v4/overview/erc20/current_value`,
          {
            params: {
              addresses: stealthAddresses,
            },
            paramsSerializer: {
              indexes: null,
            },
          }
        );

        const totalBalanceUsd = portfolioData.result.filter(
          (data) =>
            data.protocol_name === "native" || data.protocol_name === "token"
        )
          ? portfolioData.result
            .filter(
              (data) =>
                data.protocol_name === "native" ||
                data.protocol_name === "token"
            )
            .flatMap((data) => data.result)
            .filter((data) => ALLOWED_CHAIN_IDS.includes(data.chain_id))
            .reduce((acc, curr) => {
              return acc + parseFloat(curr.value_usd);
            }, 0)
          : 0;

        const tokens = [];

        // STEP 2 get token details
        for (const chain of ALLOWED_CHAIN_IDS) {
          for (const address of stealthAddresses) {
            const { data: tokenData } = await moralisApi.get(
              `/wallets/${address}/tokens?chain=${toHex(chain)}`
            );

            const token = tokenData.result.map((token) => {
              return {
                token_address: token.token_address,
                symbol: token.symbol,
                name: token.name,
                logo: token.logo,
                balance: token.balance,
                decimals: token.decimals,
                usd_value: token.usd_value,
                native_token: token.native_token,
                chainId: chain,
              };
            });

            tokens.push(...token);

            await sleep(100);
          }
        }

        // STEP 3 save token data to db
        for (const token of tokens) {
          const existingToken = await prismaClient.token.findFirst({
            where: {
              address: token.token_address,
            },
          });

          if (!existingToken) {
            await prismaClient.token.create({
              data: {
                address: token.token_address,
                symbol: token.symbol,
                name: token.name,
                logo: token.logo,
                decimals: token.decimals,
                chain: {
                  connect: {
                    id: token.chainId,
                  },
                },
              },
            });
          }
        }

        //STEP 4 get chart data
        const { data: balanceChartData } = await oneInchApi.get(
          `/portfolio/portfolio/v4/general/value_chart?addresses=${"0x278A2d5B5C8696882d1D2002cE107efc74704ECf"}&chain_id=1&timerange=1day`
        );

        const result = {
          totalBalanceUsd,
          tokens,
          balanceChartData: balanceChartData.result,
          stealthAddresses: aliasData.stealthAddresses,
        };

        return reply.send(result);
      } catch (e) {
        console.log("Error getting wallet assets", e);
        return reply.status(500).send({
          message: "Error getting wallet assets",
        });
      }
    }
  );

  app.get(
    "/wallet-assets/:fullAlias/transactions",
    async function (req, reply) {
      try {
        const { fullAlias } = req.params;
        const { isTestnet = true } = req.query;

        // Split the full alias to get the alias
        const aliasParts = fullAlias.split(".");
        const alias = aliasParts[aliasParts.length - 4] || "";
        const username = aliasParts[aliasParts.length - 3];

        const transactions = await prismaClient.transaction.findMany({
          where: {
            stealthAddress: {
              alias: {
                alias: alias,
                user: {
                  username: username,
                }
              }
            }
          },
          select: {
            chainId: true,
            chain: {
              select: {
                id: true,
                name: true,
                blockExplorerUrl: true,
                isTestnet: true,
                nativeToken: true
              }
            },
            fromAddress: true,
            toAddress: true,
            isNative: true,
            token: {
              select: {
                address: true,
                name: true,
                symbol: true,
                logo: true,
                decimals: true,
                stats: {
                  select: {
                    priceUSD: true
                  }
                }
              }
            },
            value: true,
            amount: true,
            txHash: true,
            stealthAddress: {
              select: {
                address: true
              }
            },
          },
          orderBy: {
            createdAt: "desc"
          }
        });

        return reply.send(transactions);
      } catch (error) {
        console.log("Error getting wallet transactions", error);
        return reply.code(500).send({
          message: "Error getting wallet transactions",
        });
      }
    }
  );

  done();
};
