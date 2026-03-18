import { BlockfrostProvider, core } from '@meshsdk/core';
import { config } from './config.js';

export interface ValidationResult {
  allowed: boolean;
  reason?: string | string[]; // Can be a single reason or an array of reasons (e.g., NFT names)
}

/**
 * Decodes a hex address (CBOR) to bech32 if needed.
 */
const ensureBech32 = (address: string): string => {
  if (address.startsWith('addr')) return address;

  try {
    // CIP-30 getChangeAddress returns a CBOR-encoded hex string
    // fromBytes expects a Uint8Array, so convert hex → bytes first
    const bytes = Buffer.from(address, 'hex');
    const decoded = core.Address.fromBytes(bytes);
    if (!decoded) throw new Error('fromBytes returned null');
    return decoded.toBech32();
  } catch (err) {
    try {
      // Fallback: some wallets may send a raw bech32/base58 string
      const decoded = core.Address.fromString(address);
      if (!decoded) throw new Error('fromString returned null');  // fix TS2531
      return decoded.toBech32();
    } catch (err2) {
      console.error('Failed to decode address:', address, err2);
      return address;
    }
  }
};

/**
 * Check if a Cardano address owns an NFT from the specified Policy ID.
 * This uses the Mesh SDK and Blockfrost API.
 */
export const checkNftOwnership = async (addressInput: string): Promise<ValidationResult> => {
  if (!config.BLOCKFROST_API_KEY || !config.NFT_POLICY_ID) {
    console.warn('Blockfrost API Key or NFT Policy ID is missing. Skipping real NFT check.');
    return { allowed: true }; // Default to true if not configured (to allow development)
  }

  const cardanoAddress = ensureBech32(addressInput);
  console.log(`Checking NFT ownership for address: ${cardanoAddress}`);

  try {
    const provider = new BlockfrostProvider(config.BLOCKFROST_API_KEY);
    // fetchAddressAssets returns an object mapping unit to quantity
    const assets: { [key: string]: string } = await provider.fetchAddressAssets(cardanoAddress);

    const aliases: string[] = [];

    // Check if any of the units in the object starts with the Policy ID
    const units = Object.keys(assets);
    const ownsNft = units.some(unit => {
      if (unit.startsWith(config.NFT_POLICY_ID)) {
        const assetNameHex = unit.slice(config.NFT_POLICY_ID.length);
        try {
          const assetName = Buffer.from(assetNameHex, 'hex').toString('utf-8');
          aliases.push(assetName);
        } catch (err) {
          console.warn(`Failed to decode asset name for unit: ${unit}`, err);
        }
        return true;
      }``
      return false;
    });

    if (ownsNft) {
      return { allowed: true, reason: aliases };
    } else {
      return { allowed: false, reason: `You do not own an NFT with Policy ID: ${config.NFT_POLICY_ID}` };
    }
  } catch (error: any) {
    console.error('Error checking Cardano NFT ownership:', error);
    return { allowed: false, reason: 'Failed to verify NFT ownership on the blockchain.' };
  }
};

export const checkCredential = async (aliases: string[], credential: string): Promise<ValidationResult> => {
  if (!config.ANDAMIO_API_KEY) {
    console.warn('Andamio API Key is missing. Skipping real credential check.');
    return { allowed: true };
  }

  try {
    for (const alias of aliases) {
      
      const url = `https://preprod.api.andamio.io/api/v2/users/${alias.substring(1)}/state`;
      
      console.log(`Checking credential at: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': config.ANDAMIO_API_KEY,
          'Accept': 'application/json'
        }
      });

      console.log(`Andamio API Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const text = await response.text();
        console.warn(`Andamio API error for ${alias.substring(1)}: ${text.substring(0, 100)}...`);
        continue; // Try next alias if this one fails
      }

      const data = await response.json();
      console.log(`Andamio API response for ${alias.substring(1)}:`, JSON.stringify(data));

      // Check both completed and joined projects
      const isCompleted = data.completed_projects?.some((project: any) => project.project_id === credential);
      const isJoined = data.joined_projects?.some((project: any) => project === credential);

      if (isCompleted || isJoined) {
        console.log(`Credential ${credential} verified for ${alias.substring(1)}`);
        return { allowed: true };
      }
    }

    return { allowed: false, reason: `Credential '${credential}' not found for the provided wallet handles.` };
  } catch (error: any) {
    console.error('Error checking credential:', error);
    return { allowed: false, reason: 'Failed to verify credential due to a system error.' };
  }
};

/**
 * Example: Check if the user's account is at least 30 days old.
 */
export const checkAccountAge = async (createdAt: string): Promise<ValidationResult> => {
  const accountDate = new Date(parseInt(createdAt));
  const now = new Date();
  const diffDays = Math.ceil(Math.abs(now.getTime() - accountDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays >= 30) {
    return { allowed: true };
  } else {
    return { allowed: false, reason: 'Your Discord account must be at least 30 days old.' };
  }
};
