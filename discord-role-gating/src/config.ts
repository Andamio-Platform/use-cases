import dotenv from 'dotenv';
dotenv.config();

export const config = {
  CLIENT_ID: process.env.CLIENT_ID || '',
  CLIENT_SECRET: process.env.CLIENT_SECRET || '',
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  GUILD_ID: process.env.GUILD_ID || '',
  ROLE_ID: process.env.ROLE_ID || '',
  REDIRECT_URI: process.env.REDIRECT_URI || 'http://localhost:3000/callback',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  PORT: process.env.PORT || '3000',
  BLOCKFROST_API_KEY: process.env.BLOCKFROST_API_KEY || '',
  NFT_POLICY_ID: process.env.NFT_POLICY_ID || '',
  ANDAMIO_API_KEY: process.env.ANDAMIO_API_KEY || '',
  REQUIRED_CREDENTIAL: process.env.REQUIRED_CREDENTIAL || '',
};

// Simple validation
const required = ['CLIENT_ID', 'CLIENT_SECRET', 'BOT_TOKEN', 'GUILD_ID', 'ROLE_ID', 'BLOCKFROST_API_KEY', 'NFT_POLICY_ID', 'ANDAMIO_API_KEY', 'REQUIRED_CREDENTIAL'];
for (const key of required) {
  if (!config[key as keyof typeof config]) {
    console.warn(`Warning: Missing ${key} in environment variables.`);
  }
}
