import express, { Request, Response } from 'express';
import { config } from './config.js';
import { getAuthUrl, getAccessToken, getDiscordUser, getAccountCreationDate } from './oauth2.js';
import { assignRole, startBot } from './discord.js';
import { checkNftOwnership, checkAccountAge, checkCredential } from './validators.js';

const app = express();
const port = config.PORT;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Start the Discord Bot
startBot();

// In-memory "session" mapping to store user info during the flow
// In production, use a proper session/database!
const userSessions: Record<string, { discordId: string; username: string }> = {};

// Root route - Display a simple "Verify" button
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head><title>Discord Verification</title></head>
      <body>
        <h1>Verify your Discord Role</h1>
        <p>This will check your Cardano NFT ownership and account age before granting the role.</p>
        <a href="/login" style="padding: 10px 20px; background-color: #5865F2; color: white; text-decoration: none; border-radius: 5px;">Login with Discord</a>
      </body>
    </html>
  `);
});

// Redirect to Discord OAuth2
app.get('/login', (req: Request, res: Response) => {
  res.redirect(getAuthUrl());
});

// OAuth2 Callback
app.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // 1. Exchange code for access token
    const accessToken = await getAccessToken(code);

    // 2. Identify user
    const user = await getDiscordUser(accessToken);

    // Store in session (temp id for state)
    const sessionId = Math.random().toString(36).substring(7);
    userSessions[sessionId] = { discordId: user.id, username: user.username };

    // 3. Prompt for Cardano Wallet Connection
    res.send(`
      <html>
        <head>
          <title>Cardano Wallet Connection</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; }
            .wallet-button { 
              display: flex; align-items: center; justify-content: space-between;
              width: 100%; padding: 12px; margin: 8px 0; 
              border: 1px solid #ddd; border-radius: 8px; 
              background: white; cursor: pointer; font-size: 16px; transition: background 0.2s;
            }
            .wallet-button:hover { background: #f8f9fa; border-color: #0033ad; }
            .wallet-icon { width: 24px; height: 24px; }
            #status { margin-top: 1rem; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Step 2: Connect Wallet</h1>
            <p>Logged in as: <b>${user.username}</b></p>
            <p>Please select your Cardano wallet to verify ownership:</p>
            
            <div id="wallet-list">Loading wallets...</div>
            <div id="status"></div>

            <form id="verify-form" action="/verify-final" method="POST" style="display: none;">
              <input type="hidden" name="sessionId" value="${sessionId}">
              <input type="hidden" name="cardanoAddress" id="cardanoAddress">
            </form>
          </div>

          <script type="module">
            const walletListDiv = document.getElementById('wallet-list');
            const status = document.getElementById('status');

            async function loadMesh() {
              const bundleUrls = [
                'https://esm.sh/@meshsdk/core@2.1.8?bundle',
                'https://esm.sh/@meshsdk/wallet@2.1.8?bundle',
                'https://cdn.jsdelivr.net/npm/@meshsdk/core@2.1.8/+esm'
              ];

              for (const url of bundleUrls) {
                try {
                  console.log('Attempting to load bundled Mesh SDK from:', url);
                  const mesh = await import(url);
                  // Mesh v2 exports BrowserWallet in both core and wallet
                  const BrowserWallet = mesh.BrowserWallet || mesh.default?.BrowserWallet;
                  if (BrowserWallet) {
                    console.log('Mesh SDK loaded successfully from:', url);
                    return BrowserWallet;
                  }
                } catch (e) {
                  console.warn('Failed to load bundle from ' + url + ':', e.message);
                }
              }
              return null;
            }

            // Fallback for raw wallet discovery if library fails
            function getRawWallets() {
              if (!window.cardano) return [];
              return Object.keys(window.cardano)
                .filter(id => window.cardano[id].apiVersion)
                .map(id => ({
                  id: id,
                  name: window.cardano[id].name || id,
                  icon: window.cardano[id].icon,
                  version: window.cardano[id].apiVersion
                }));
            }

            async function start() {
              console.log('Verification script starting...');
              try {
                status.innerText = 'Initializing...';
                
                // Try to load the library
                const BrowserWallet = await loadMesh();
                
                // Even if library fails, we can still show wallets and try raw connection
                await new Promise(r => setTimeout(r, 1000));
                
                let wallets = [];
                if (BrowserWallet) {
                  wallets = BrowserWallet.getInstalledWallets();
                } else {
                  console.warn('Mesh library failed to load, falling back to raw discovery');
                  wallets = getRawWallets();
                }

                if (!wallets || wallets.length === 0) {
                  walletListDiv.innerHTML = \`
                    <div style="color: #856404; background-color: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffeeba; margin-bottom: 15px;">
                      <strong>No Wallets Found</strong><br>
                      <p style="font-size: 13px; margin: 10px 0;">We couldn't detect any Cardano extensions in your browser.</p>
                    </div>
                    <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                      Scan Again
                    </button>
                  \`;
                  status.innerText = '';
                  return;
                }

                status.innerText = 'Select your Cardano wallet:';
                walletListDiv.innerHTML = '';
                
                wallets.forEach(wallet => {
                  const btn = document.createElement('button');
                  btn.className = 'wallet-button';
                  btn.innerHTML = \`
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <img src="\${wallet.icon}" class="wallet-icon">
                      <span style="font-weight: 500;">\${wallet.name.charAt(0).toUpperCase() + wallet.name.slice(1)}</span>
                    </div>
                    <span style="font-size: 12px; color: #666;">\${wallet.version ? 'v' + wallet.version : ''}</span>
                  \`;
                  btn.onclick = () => connect(BrowserWallet, wallet.id || wallet.name);
                  walletListDiv.appendChild(btn);
                });
              } catch (err) {
                console.error('Final start error:', err);
                status.innerText = 'An error occurred during initialization.';
              }
            }

            async function connect(BrowserWallet, walletId) {
              try {
                status.innerText = 'Connecting to wallet...';

                let address = '';
                if (BrowserWallet) {
                  const wallet = await BrowserWallet.enable(walletId);
                  status.innerText = 'Wallet connected! Fetching address...';
                  address = await wallet.getChangeAddress();
                } else {
                  const api = await window.cardano[walletId].enable();
                  status.innerText = 'Connected! Retrieving address...';
                  const hexAddress = await api.getChangeAddress();

                  // Decode hex address to bech32 using the CSL library if available,
                  // otherwise fall back to raw hex and let the server handle it
                  if (window.CardanoWasm) {
                    const cslAddress = window.CardanoWasm.Address.from_bytes(
                      Buffer.from(hexAddress, 'hex')
                    );
                    address = cslAddress.to_bech32();
                    console.log('Decoded hex to bech32 client-side');
                  } else if (window.MeshSDK || window.Mesh) {
                    // Attempt Mesh utility if partially loaded
                    const sdk = window.MeshSDK || window.Mesh;
                    address = sdk.resolveAddress ? sdk.resolveAddress(hexAddress) : hexAddress;
                  } else {
                    // Last resort: send hex and rely on server decoding
                    address = hexAddress;
                    console.warn('No decoding library available — sending raw hex');
                  }
                }

                if (!address) throw new Error('Could not retrieve a valid address.');

                document.getElementById('cardanoAddress').value = address;
                status.innerText = 'Success! Verifying...';
                document.getElementById('verify-form').submit();
              } catch (err) {
                console.error('Connection error:', err);
                const errorMsg = err.info || err.message || 'Connection refused';
                status.innerHTML = '<span style="color: #dc3545;"><b>Connection Failed:</b> ' + errorMsg + '</span>';
              }
            }

            start();
          </script>

          <script src="https://cdn.jsdelivr.net/npm/@emurgo/cardano-serialization-lib-browser/cardano_serialization_lib.js"></script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Callback error:', error.response?.data || error.message);
    res.status(500).send('An error occurred during verification.');
  }
});

// Final Verification Endpoint
app.post('/verify-final', async (req: Request, res: Response) => {
  const { sessionId, cardanoAddress } = req.body;
  const session = userSessions[sessionId];

  if (!session) {
    return res.status(400).send('Session expired or invalid. Please try again.');
  }

  try {
    const { discordId, username } = session;

    // 1. Validate Account Age
    const creationDate = getAccountCreationDate(discordId);
    const ageResult = await checkAccountAge(creationDate);
    if (!ageResult.allowed) {
      return res.status(403).send(`Verification failed: ${ageResult.reason}`);
    }

    // 2. Validate Cardano NFT Ownership using Mesh SDK
    const { allowed: nftAllowed, reason: nftReason } = await checkNftOwnership(cardanoAddress);
    if (!nftAllowed) {
      return res.status(403).send(`Verification failed: ${nftReason}`);
    }

    // 3. Check credential
    const credentialResult = await checkCredential(nftReason as string[], config.REQUIRED_CREDENTIAL as string);
    if (!credentialResult.allowed) {
      return res.status(403).send(`Verification failed: ${credentialResult.reason}`);
    }

    // 4. Assign role via bot
    const result = await assignRole(discordId);

    if (result.success) {
      // Clear session
      delete userSessions[sessionId];
      res.send(`Successfully verified! Role has been assigned to <b>${username}</b>.`);
    } else {
      res.status(500).send(`Verification failed: ${result.message}`);
    }
  } catch (error: any) {
    console.error('Final verification error:', error);
    res.status(500).send('An error occurred during the final verification step.');
  }
});

app.listen(port, () => {
  console.log(`Web server listening at http://localhost:${port}`);
});
