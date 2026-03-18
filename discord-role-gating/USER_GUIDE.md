# User Verification Guide

Welcome! This guide explains how to verify your account and receive your special roles in our Discord server.

## Step-by-Step Verification

### 1. Start the Verification
In any channel, type the slash command:
`/verify`

A message will appear with a "Click here to verify" button. Note that this message is only visible to you.

### 2. Login with Discord
Clicking the button will open our verification portal in your web browser. You will be asked to log in with your Discord account.
- **Why?** This is a secure way for our system to know who you are and verify your eligibility without ever seeing your password.
- **Permissions:** We only request "Identify" access, which lets us see your Discord ID and basic profile.

### 3. Connect Cardano Wallet
After the Discord login, you will be prompted to enter your Cardano wallet address (`addr1...`).
- **Important:** Ensure you provide the correct address that contains your NFTs.
- **Privacy:** We only use this address to check for the required assets on the Cardano blockchain.

### 4. Automatic Validation
Our system will check if you meet the criteria for the role using the **Mesh SDK**:
- **NFT Ownership:** Verifying if the provided wallet holds an asset from the required Policy ID.
- **Account Age:** Ensuring your Discord account is at least 30 days old.


### 4. Role Assignment
If all checks pass, you'll see a success message! Our bot will then automatically assign the role to your account in the server.

---

## Troubleshooting

### "Verification failed: Your account is too new"
To prevent spam, we require accounts to be at least 30 days old. Please wait and try again after your account reaches this age.

### "Verification failed: You do not own the required NFT"
Make sure you have the required NFT in the wallet that's linked to your account. If you just purchased it, please allow a few minutes for the blockchain to sync.

### "Something went wrong during verification"
If you encounter any other errors, please contact a moderator or open a support ticket in our Discord server.
