import { prismaClient } from "../../lib/db/prisma.js";
import { authMiddleware } from "../../lib/middlewares/authMiddleware.js";
import { oneInchApi } from "../../lib/1inch/api.js";
import { sleep } from "../../utils/miscUtils.js";
import { moralisApi } from "../../lib/moralis/api.js";
import { erc20Abi, toHex } from "viem";
import { ALLOWED_CHAIN_IDS, CHAINS } from "../../config.js";
import { verifyFields } from "../../utils/request.js";
import { Contract, ethers, JsonRpcProvider } from "ethers";
import { getTokenMetadata } from "../../utils/tokenUtils.js";
import {
  aggregateBalances,
  getAliasesList,
  getAliasTotalBalanceUSD,
} from "./helpers.js";

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
          }),
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

  app.get(
    "/wallet-assets/:username/total-balance",
    async function (req, reply) {
      const { username } = req.params;

      try {
        const user = await prismaClient.user.findFirst({
          where: { username },
          include: {
            aliases: true,
          },
        });

        if (!user) {
          return reply.send(0);
        }

        const aliases = user.aliases;

        let totalBalanceUSD = 0;
        for (const alias of aliases) {
          if (alias.alias === "") continue;
          const balance = await getAliasTotalBalanceUSD(
            alias.alias,
            user.username
          );
          totalBalanceUSD += balance;
        }

        return reply.send(totalBalanceUSD);
      } catch (e) {
        console.log("Error getting total balances", e);
        return reply.status(500).send({
          message: "Error getting total balances",
        });
      }
    }
  );

  app.get("/wallet-assets/:username/all-assets", async function (req, reply) {
    const { username } = req.params;

    if (!username) {
      return reply.status(400).send({
        message: "Username is required",
      });
    }

    try {
      // Fetch all aliases and related stealth addresses for the user
      const userData = await prismaClient.user.findFirst({
        where: { username },
        include: {
          aliases: {
            include: {
              stealthAddresses: {
                select: {
                  address: true,
                  ephemeralPub: true,
                  viewHint: true,
                  createdAt: true,
                  alias: {
                    select: {
                      id: true,
                      alias: true,
                      createdAt: true,
                    },
                  },
                  transactions: {
                    select: {
                      chainId: true,
                      isNative: true,
                      token: { select: { address: true, decimals: true } },
                    },
                  },
                },
                take: 50,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!userData) {
        return reply.status(404).send({ message: "User not found" });
      }

      let allStealthAddresses = [];
      // Loop over each alias and process balances for each stealth address
      for (const alias of userData.aliases) {
        const stealthAddresses = alias.stealthAddresses.map(
          (stealthAddress) => {
            const nativeTokens = new Set();
            const erc20Tokens = new Map();

            stealthAddress.transactions.forEach(
              ({ chainId, isNative, token }) => {
                if (isNative) nativeTokens.add(chainId);
                else if (token?.address) {
                  erc20Tokens.set(`${chainId}_${token.address}`, {
                    chainId,
                    address: token.address,
                    decimals: token.decimals,
                  });
                }
              }
            );

            return {
              ...stealthAddress,
              key: alias.key,
              nativeTokens: [...nativeTokens],
              erc20Tokens: [...erc20Tokens.values()],
            };
          }
        );

        // Fetch balances in parallel for all stealth addresses in this alias
        await Promise.all(
          stealthAddresses.map(async (stealthAddress) => {
            // GET NATIVE BALANCES
            const nativeBalancePromises = stealthAddress.nativeTokens.map(
              async (chainId) => {
                const network = CHAINS.find((chain) => chain.id === chainId);
                if (!network) return null;

                const provider = new JsonRpcProvider(network.rpcUrl);
                const balance = await provider.getBalance(
                  stealthAddress.address
                );
                const formattedBalance = parseFloat(
                  ethers.formatEther(balance)
                );

                const nativeToken = await prismaClient.nativeToken.findFirst({
                  where: { chainId },
                  select: {
                    name: true,
                    symbol: true,
                    logo: true,
                    priceUSD: true,
                  },
                });

                return {
                  chainId,
                  balance: formattedBalance,
                  chainName: network.name,
                  chainLogo: network.imageUrl,
                  priceUSD: nativeToken.priceUSD * formattedBalance,
                  nativeToken,
                };
              }
            );

            // GET ERC 20 BALANCES
            const erc20BalancePromises = stealthAddress.erc20Tokens.map(
              async ({ chainId, address, decimals }) => {
                const network = CHAINS.find((chain) => chain.id === chainId);
                if (!network) return;

                const provider = new JsonRpcProvider(network.rpcUrl);
                const contract = new Contract(address, erc20Abi, provider);
                const balance = await contract.balanceOf(
                  stealthAddress.address
                );
                const formattedBalance = parseFloat(
                  ethers.formatUnits(balance, decimals)
                );

                const tokenMetadata = await getTokenMetadata({
                  tokenAddress: address,
                  chainId,
                });
                const tokenPrice = await prismaClient.token.findFirst({
                  where: { address },
                  select: { stats: { select: { priceUSD: true } } },
                });

                return {
                  chainId,
                  address,
                  balance: formattedBalance,
                  chainName: network.name,
                  chainLogo: network.imageUrl,
                  token: {
                    name: tokenMetadata.name,
                    symbol: tokenMetadata.symbol,
                    logo: tokenMetadata.logo,
                    decimals: tokenMetadata.decimals,
                    priceUSD: tokenPrice.stats.priceUSD,
                  },
                  balanceUSD: tokenPrice.stats.priceUSD * formattedBalance,
                };
              }
            );

            // Assign balances to the stealth address
            stealthAddress.nativeBalances = await Promise.all(
              nativeBalancePromises
            );
            stealthAddress.erc20Balances = await Promise.all(
              erc20BalancePromises
            );

            delete stealthAddress.nativeTokens;
            delete stealthAddress.erc20Tokens;
            delete stealthAddress.transactions;

            // Add processed stealth address to the global list
            allStealthAddresses.push(stealthAddress);
          })
        );
      }

      // Aggregate all balances across aliases
      const { aggregatedBalances, totalBalanceUSD } =
        aggregateBalances(allStealthAddresses);

      const aliasesList = getAliasesList({
        stealthAddresses: allStealthAddresses,
        aliasesList: userData.aliases,
      });

      // Get all user aliases
      // const userAliases = await prismaClient.userAlias.findMany({
      //   where: {
      //     user: {
      //       username,
      //     },
      //   },
      //   orderBy: {
      //     createdAt: "asc",
      //   },
      //   select: {
      //     id: true,
      //     alias: true,
      //     createdAt: true,
      //   },
      // });

      // for (let i = 0; i < userAliases.length; i++) {
      //   const aliasId = userAliases[i].id;
      //   const balanceUSD =
      //     aliasesList.find((a) => a.id === aliasId)?.balanceUSD || 0;
      //   userAliases[i].balanceUSD = parseFloat(balanceUSD);
      //   userAliases[i].index = i + 1;
      // }

      // console.log('userAliases', userAliases);

      return reply.send({
        aliasesList,
        aggregatedBalances,
        stealthAddresses: allStealthAddresses,
        totalBalanceUSD,
      });
    } catch (e) {
      console.error("Error getting wallet assets", e);
      return reply.status(500).send({ message: "Error getting wallet assets" });
    }
  });

  app.get("/wallet-assets/:fullAlias/assets", async function (req, reply) {
    try {
      const { fullAlias } = req.params;
      const { isTestnet = true } = req.query;

      const aliasParts = fullAlias.split(".");
      const alias = aliasParts[aliasParts.length - 4] || "";
      const username = aliasParts[aliasParts.length - 3];

      // Fetch alias and related data in a single query
      const aliasData = await prismaClient.userAlias.findFirst({
        where: { alias, user: { username } },
        include: {
          stealthAddresses: {
            where: { isTransacted: true },
            select: {
              address: true,
              ephemeralPub: true,
              viewHint: true,
              isTransacted: true,
              createdAt: true,
              alias: {
                select: {
                  id: true,
                  alias: true,
                  createdAt: true,
                },
              },
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

      if (!aliasData)
        return reply.status(404).send({ message: "Alias not found" });
      const stealthAddressesData = aliasData.stealthAddresses;

      let stealthAddressWithAssets = stealthAddressesData.map(
        (stealthAddress) => {
          const nativeTokens = new Set();
          const erc20Tokens = new Map();

          stealthAddress.transactions.forEach(
            ({ chainId, isNative, token }) => {
              if (isNative) nativeTokens.add(chainId);
              else if (token?.address)
                erc20Tokens.set(`${chainId}_${token.address}`, {
                  chainId,
                  address: token.address,
                });
            }
          );

          return {
            ...stealthAddress,
            nativeTokens: [...nativeTokens],
            erc20Tokens: [...erc20Tokens.values()],
          };
        }
      );

      // Fetch native and ERC20 token balances in parallel
      await Promise.all(
        stealthAddressWithAssets.map(async (stealthAddress) => {
          const providerPromises = stealthAddress.nativeTokens.map(
            async (chainId) => {
              const network = CHAINS.find((chain) => chain.id === chainId);
              if (!network) return;

              const provider = new JsonRpcProvider(network.rpcUrl);

              const balance = await provider.getBalance(stealthAddress.address);

              const formattedBalance = parseFloat(ethers.formatEther(balance));

              // console.log({
              //   chainId,
              //   stealthAddress: stealthAddress.address,
              //   formattedBalance,
              // });

              const nativeToken = await prismaClient.nativeToken.findFirst({
                where: { chainId },
                select: {
                  name: true,
                  symbol: true,
                  logo: true,
                  priceUSD: true,
                },
              });

              return {
                chainId,
                balance: formattedBalance,
                chainName: network.name,
                chainLogo: network.imageUrl,
                priceUSD: nativeToken.priceUSD * formattedBalance,
                nativeToken: nativeToken,
              };
            }
          );

          const contractPromises = stealthAddress.erc20Tokens.map(
            async ({ chainId, address }) => {
              const network = CHAINS.find((chain) => chain.id === chainId);
              if (!network) return;

              const provider = new JsonRpcProvider(network.rpcUrl);
              const contract = new Contract(address, erc20Abi, provider);
              const balance = await contract.balanceOf(stealthAddress.address);

              const tokenMetadata = await getTokenMetadata({
                tokenAddress: address,
                chainId,
              });

              const formattedBalance = parseFloat(
                ethers.formatUnits(balance, tokenMetadata.decimals)
              );

              const tokenPrice = await prismaClient.token.findFirst({
                where: { address },
                select: { stats: { select: { priceUSD: true } } },
              });

              // console.log('token', tokenMetadata);
              return {
                chainId,
                address,
                balance: formattedBalance,
                chainName: network.name,
                chainLogo: network.imageUrl,
                token: {
                  name: tokenMetadata.name,
                  symbol: tokenMetadata.symbol,
                  logo: tokenMetadata.logo,
                  decimals: tokenMetadata.decimals,
                  priceUSD: tokenPrice.stats.priceUSD,
                },
                balanceUSD: (tokenPrice.stats.priceUSD || 0) * formattedBalance,
              };
            }
          );

          // Collect balances
          stealthAddress.nativeBalances = await Promise.all(providerPromises);
          stealthAddress.erc20Balances = await Promise.all(contractPromises);

          delete stealthAddress.nativeTokens;
          delete stealthAddress.erc20Tokens;
          delete stealthAddress.transactions;
        })
      );

      // Remove stealth addresses with no balances (empty native and erc20 balances)
      stealthAddressWithAssets = stealthAddressWithAssets.filter(
        (stealthAddress) =>
          stealthAddress.nativeBalances.length > 0 ||
          stealthAddress.erc20Balances.length > 0
      );

      // Aggregate balances
      const { aggregatedBalances, totalBalanceUSD } = aggregateBalances(
        stealthAddressWithAssets
      );

      // Order aggregated balances by the balanceUSD
      console.log("aggregatedBalances", aggregatedBalances);

      const aliasesList = getAliasesList({
        stealthAddresses: stealthAddressWithAssets,
      });

      return reply.send({
        aliasesList,
        aggregatedBalances,
        stealthAddresses: stealthAddressWithAssets,
        totalBalanceUSD,
      });
    } catch (e) {
      console.error("Error getting wallet assets", e);
      return reply.status(500).send({ message: "Error getting wallet assets" });
    }
  });

  app.get(
    "/wallet-assets/:fullAlias/transactions",
    async function (req, reply) {
      try {
        const { fullAlias } = req.params;
        const { isTestnet = "true" } = req.query;

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
                },
              },
            },
          },
          select: {
            chainId: true,
            chain: {
              select: {
                id: true,
                name: true,
                blockExplorerUrl: true,
                isTestnet: true,
                imageUrl: true,
                nativeToken: {
                  select: {
                    name: true,
                    symbol: true,
                    logo: true,
                    priceUSD: true,
                  },
                },
              },
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
                    priceUSD: true,
                  },
                },
              },
            },
            value: true,
            amount: true,
            txHash: true,
            stealthAddress: {
              select: {
                address: true,
                alias: {
                  select: {
                    alias: true,
                  },
                },
              },
            },
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
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

  app.get(
    "/wallet-assets/:fullAlias/aggregated-transactions",
    async function (req, reply) {
      try {
        const { fullAlias } = req.params;
        const { isTestnet = "true" } = req.query;

        // Split the full alias to get the alias
        const aliasParts = fullAlias.split(".");
        const alias = aliasParts[aliasParts.length - 4] || "";
        const username = aliasParts[aliasParts.length - 3];

        if (alias) {
          // Must only alias like john.squidl.me, not doe.john.squidl.me
          return reply.code(400).send({
            message:
              "You must only provide the root alias, not sub-alias. Example: john.squidl.me",
          });
        }

        const transactions = await prismaClient.transaction.findMany({
          where: {
            stealthAddress: {
              alias: {
                user: {
                  username: username,
                },
              },
            },
          },
          select: {
            chainId: true,
            chain: {
              select: {
                id: true,
                name: true,
                blockExplorerUrl: true,
                isTestnet: true,
                imageUrl: true,
                nativeToken: {
                  select: {
                    name: true,
                    symbol: true,
                    logo: true,
                    priceUSD: true,
                  },
                },
              },
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
                    priceUSD: true,
                  },
                },
              },
            },
            value: true,
            amount: true,
            txHash: true,
            stealthAddress: {
              select: {
                address: true,
                alias: {
                  select: {
                    alias: true,
                  },
                },
              },
            },
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
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

  // CHARTS DATA ENDPOINT FOR USER BALANCE HISTORY USE MORALIS API

  app.get("/wallet-assets/:username/charts-new", async (req, reply) => {
    const { username } = req.params;
    const { isTestnet = "false" } = req.query;

    const user = await prismaClient.user.findFirst({
      where: {
        username,
      },
      include: {
        aliases: {
          include: {
            stealthAddresses: {
              where: {
                isTransacted: true,
              },
              select: {
                address: true,
              },
              take: 50,
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        wallet: true,
      },
    });

    const userAddress = user.wallet.address;

    // USDC contract addresses
    const USDC_ADDRESSES = {
      mainnet: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      testnet: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
    };

    const chainId = isTestnet === "true" ? "sepolia" : "0x1"; // 0xaa36a7 for Sepolia, 0x1 for Ethereum mainnet
    const usdcAddress =
      isTestnet === "true" ? USDC_ADDRESSES.testnet : USDC_ADDRESSES.mainnet;

    async function getErc20TxHistory(address) {
      const { data: erc20TransferHistory } = await moralisApi.get(
        `/${address}/erc20/transfers`,
        {
          params: {
            chain: chainId,
            contract_addresses: [usdcAddress],
            order: "ASC",
          },
        }
      );

      await sleep(50);

      return erc20TransferHistory ? erc20TransferHistory.result : [];
    }

    async function getErc20TokenBalance() {
      const { data: erc20TokenBalances } = await moralisApi.get(
        `/${userAddress}/erc20`,
        {
          params: {
            chain: chainId,
            token_addresses: [usdcAddress],
          },
        }
      );

      return erc20TokenBalances;
    }

    async function getTokenPrice() {
      const { data: tokenPrice } = await moralisApi.get(
        `/erc20/${usdcAddress}/price`,
        {
          params: {
            chain: chainId,
          },
        }
      );

      return tokenPrice;
    }

    const mockUsdcPrice = {
      tokenName: "USD Coin",
      tokenSymbol: "USDC",
      tokenLogo:
        "https://cdn.moralis.io/eth/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
      tokenDecimals: "6",
      usdPrice: 1.0,
      usdPriceFormatted: "1.00",
      "24hrPercentChange": "0.00",
      exchangeAddress: "0x1f98431c8ad98523631ae4a59f267346ea31f984",
      exchangeName: "Uniswap v3",
      tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      toBlock: "16314545",
      possibleSpam: "false",
      verifiedContract: true,
      pairAddress: "0x1f98431c8ad98523631ae4a59f267346ea31f984",
      pairTotalLiquidityUsd: "500000000",
    };

    try {
      const stealthAddresses = user.aliases
        .flatMap((alias) => alias.stealthAddresses)
        .map((sa) => sa.address);

      const stealthAddressSet = new Set(
        stealthAddresses.map((sa) => sa.toLowerCase())
      );

      const allTransferHistories = await Promise.all(
        stealthAddresses.map((address) => getErc20TxHistory(address))
      );

      const transferHistory = allTransferHistories.flat();

      const [currentBalanceData, priceData] = await Promise.all([
        getErc20TokenBalance(),
        isTestnet ? [mockUsdcPrice] : getTokenPrice(),
      ]);

      const currentPriceUSD = priceData[0].usdPrice;

      // Ensure transfer history is sorted by time (ascending) if not already
      transferHistory.sort(
        (a, b) => new Date(a.block_timestamp) - new Date(b.block_timestamp)
      );

      const balanceHistory = [
        {
          timestamp:
            new Date(
              transferHistory[0]?.block_timestamp || Date.now()
            ).getTime() - 1,
          date: new Date(
            transferHistory[0]?.block_timestamp || Date.now()
          ).toISOString(),
          balance: 0,
          balanceUSD: 0,
        },
      ];

      // Find the first incoming transaction to set the genesis balance
      const genesisTransaction = transferHistory.find((tx) =>
        stealthAddressSet.has(tx.to_address?.toLowerCase())
      );

      if (!genesisTransaction) {
        return reply.send(balanceHistory);
      }

      // Set the genesis balance based on the first incoming transfer
      const decimals = parseInt(currentBalanceData[0]?.decimals || 6);
      const decimalFactor = Math.pow(10, decimals);
      let runningBalance = parseFloat(genesisTransaction.value) / decimalFactor;

      balanceHistory.push({
        timestamp: new Date(genesisTransaction.block_timestamp).getTime(),
        date: new Date(genesisTransaction.block_timestamp).toISOString(),
        balance: parseFloat(runningBalance.toFixed(6)),
        balanceUSD: parseFloat((runningBalance * currentPriceUSD).toFixed(2)),
      });

      // Process the remaining transactions after the genesis transaction
      transferHistory.forEach((tx) => {
        const txDate = new Date(tx.block_timestamp);
        const value = parseFloat(tx.value) / decimalFactor;

        // Skip the genesis transaction (already recorded)
        if (tx === genesisTransaction) return;

        // Adjust balance based on transaction direction
        if (tx.to_address.toLowerCase() === userAddress.toLowerCase()) {
          runningBalance += value; // Incoming transaction
        } else if (
          tx.from_address.toLowerCase() === userAddress.toLowerCase()
        ) {
          runningBalance -= value; // Outgoing transaction
        }

        balanceHistory.push({
          timestamp: txDate.getTime(),
          date: txDate.toISOString(),
          balance: parseFloat(runningBalance.toFixed(6)),
          balanceUSD: parseFloat((runningBalance * currentPriceUSD).toFixed(2)),
        });
      });

      // Send the response
      return reply.send(balanceHistory);
    } catch (error) {
      console.error("Error getting USDC balance history:", error);
      return reply.code(500).send({
        success: false,
        message: "Error getting USDC balance history",
        error: error.message,
      });
    }
  });

  done();
};
