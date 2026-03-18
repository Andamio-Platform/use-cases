import axios from 'axios';
import { config } from './config.js';

const DISCORD_API_ENDPOINT = 'https://discord.com/api/v10';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  public_flags?: number;
}

/**
 * Extracts the timestamp from a Discord Snowflake ID.
 * Discord IDs are "Snowflakes" which contain a timestamp.
 */
export const getAccountCreationDate = (id: string): string => {
  // Snowflake timestamp calculation: (snowflake >> 22) + 1420070400000
  const snowflake = BigInt(id);
  const timestamp = Number((snowflake >> 22n) + 1420070400000n);
  return timestamp.toString();
};

export const getAccessToken = async (code: string): Promise<string> => {
  const data = new URLSearchParams({
    client_id: config.CLIENT_ID,
    client_secret: config.CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.REDIRECT_URI,
  });

  const response = await axios.post(`${DISCORD_API_ENDPOINT}/oauth2/token`, data, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data.access_token;
};

export const getDiscordUser = async (accessToken: string): Promise<DiscordUser> => {
  const response = await axios.get(`${DISCORD_API_ENDPOINT}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};

export const getAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: config.CLIENT_ID,
    redirect_uri: config.REDIRECT_URI,
    response_type: 'code',
    scope: 'identify', // Only need identify to get user ID
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
};
