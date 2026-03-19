# Discord Role Verification System

A TypeScript-based system to verify users via Discord OAuth2 and automatically assign roles based on custom criteria (e.g., NFT ownership, account age).

> Source code: [github.com/Andamio-Platform/use-cases/tree/main/discord-role-gating](https://github.com/Andamio-Platform/use-cases/tree/main/discord-role-gating)

## Features
- **Web-based OAuth2 Flow:** Securely identifies Discord users.
- **Slash Commands:** Users can start verification directly from Discord using `/verify`.
- **Custom Validations:** Integrated framework for NFT ownership and account age checks.
- **Role Assignment:** Automatic role granting upon successful verification.

## Prerequisites
- **Node.js** (v18+)
- **Discord Developer Account**

## Setup Instructions

### 1. Discord Developer Portal Setup
1.  Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  **Create Application**: Click "New Application".
3.  **Bot Tab**:
    - Reset and copy the **Bot Token**.
    - Enable **Server Members Intent** under "Privileged Gateway Intents".
4.  **OAuth2 Tab**:
    - Note the **Client ID** and **Client Secret**.
    - Add a **Redirect URI**: `http://localhost:3000/callback` (for local dev) or your production URL.
5.  **Installation**:
    - Use the "URL Generator" under OAuth2.
    - Scopes: `bot`, `applications.commands`.
    - Bot Permissions: `Manage Roles`.
    - Open the generated URL to invite the bot to your server.

### 2. Environment Configuration
1.  **Enable Discord Developer Mode**:
    - Go to **User Settings** (the gear icon next to your name).
    - Go to **Advanced**.
    - Toggle **Developer Mode** to ON.
2.  Copy `.env.example` to `.env`.
3.  Fill in the required fields:
    - `CLIENT_ID`: Your Application ID.
    - `CLIENT_SECRET`: Your Application Client Secret.
    - `BOT_TOKEN`: Your Bot Token.
    - `GUILD_ID`: Right-click your server's name or icon in the server list and select **Copy Server ID**.
    - `ROLE_ID`: Go to **Server Settings** > **Roles**, right-click the target role, and select **Copy Role ID**.
    - `REDIRECT_URI`: Must match the URI in the Developer Portal.
    - `BASE_URL`: The root URL of your web portal (e.g., `http://localhost:3000`).

**Important:** In Discord, ensure the bot's role is positioned **above** the target role in the server's role hierarchy.

### 3. Installation & Running
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## Customizing Logic
You can add your own validation rules in `src/validators.ts`. This is where you would integrate:
- **NFT Checks:** Using Alchemy, Moralis, or ethers.js.
- **Account Checks:** Using Discord's user metadata.
- **External APIs:** Linking with your own database or service.

## Project Structure
- `src/index.ts`: Express server and OAuth2 callback handler.
- `src/discord.ts`: Discord bot client and slash command handling.
- `src/validators.ts`: Core validation logic for user eligibility.
- `src/oauth2.ts`: Discord OAuth2 API integration.
- `src/config.ts`: Environment configuration management.
