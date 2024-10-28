import * as sapphire from '@oasisprotocol/sapphire-paratime';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';  

const __dirname = path.resolve();
export const StealthSignerABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'app/lib/contracts/oasis/abi/StealthSigner.json'), 'utf8'));

// StealthSignerContract.js
export const OASIS_CONTRACT = {
  mainnet: {
    address: "",
    explorerUrl: "",
    network: {
      id: 23294,
      name: "Oasis Sapphire Mainnet",
      nativeToken: "ROSE",
      rpcUrl: "https://sapphire.oasis.io",
    }
  },
  testnet: {
    address: "0x201F0a5Ad2dD0ac254E808D4D6961D0aceaF3F00",
    explorerUrl: "https://explorer.oasis.io/testnet/sapphire/address/0x201F0a5Ad2dD0ac254E808D4D6961D0aceaF3F00",
    network: {
      id: 23295,
      name: "Oasis Sapphire Testnet",
      nativeToken: "TEST",
      rpcUrl: "https://testnet.sapphire.oasis.io",
    }
  }
}

export const stealthSignerGenerateStealthAddress = async ({
  chainId,
  metaAddress,
  key,
}) => {
  try {
    if(!chainId || !metaAddress || !key) {
      throw new Error('Missing required parameters');
    }

    const network = Object.values(OASIS_CONTRACT).find(
      (network) => network.network.id === chainId
    ).network;
    const provider = sapphire.wrap(ethers.getDefaultProvider(network.rpcUrl));

    const contract = new ethers.Contract(
      OASIS_CONTRACT.testnet.address,
      StealthSignerABI.abi,
      provider
    );

    const generatedStealthAddress = await contract.generateStealthAddress.staticCall(
      metaAddress,
      key
    );
    const [stealthAddress, ephemeralPub, viewHint] = generatedStealthAddress;

    // console.log('generatedStealthAddress', generatedStealthAddress);

    const data = {
      stealthAddress,
      ephemeralPub,
      viewHint,
    }
    return data;
  } catch (error) {
    console.log(error);
  }
}

// stealthSignerGenerateStealthAddress({
//   chainId: 23295,
//   key: 2
// })

export const stealthSignerGetMetaAddress = async ({
  chainId,
  auth
}) => {
  try {
    const network = Object.values(OASIS_CONTRACT).find(
      (network) => network.network.id === chainId
    ).network;
    const provider = sapphire.wrap(ethers.getDefaultProvider(network.rpcUrl));

    const contract = new ethers.Contract(
      OASIS_CONTRACT.testnet.address,
      StealthSignerABI.abi,
      provider
    );

    const metaAddress = await contract.getMetaAddress.staticCall(auth, 1);
    console.log('metaAddress', metaAddress);

    return metaAddress;
  } catch (error) {
    console.log(error);
  }
}