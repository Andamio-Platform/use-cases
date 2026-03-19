# Andamio Easy Onboarding User Guide

This guide walks through the wallet-based onboarding flow in the Easy Onboarding app.

## Before You Start

- Use a Cardano wallet supported by Mesh
- Make sure you can switch the wallet to Testnet or Preprod
- Keep your wallet available for signing transactions during the flow

## Step 1: Connect Your Wallet

1. Open the landing page.
2. Click **Connect wallet**.
3. Choose your wallet provider.
4. After a successful connection, the app takes you to the dashboard.

The dashboard shows your connection status, network, wallet address, and detected token alias.

## Step 2: Detect or Create an Access Token

When the dashboard loads, it checks your wallet for an Andamio access token.

- If a token is already present, Step 1 completes automatically.
- If no token is present, enter a unique alias and click **Get access token**.
- Sign and submit the transaction in your wallet.
- Wait for chain confirmation. The dashboard updates automatically once the token is detected.

## Step 3: Submit the Prerequisite Acknowledgement

After the access token is available, the app checks whether you are already enrolled in the configured prerequisite course.

- If you are not enrolled yet, click **Accept terms and conditions**.
- Review the modal and click **I accept**.
- Sign and submit the transaction in your wallet.
- Wait for the dashboard to confirm that the prerequisite submission was recorded.

## Step 4: Wait for Review

After the submission is recorded, the app checks your assignment status.

- If the status is still pending, the dashboard shows **Pending review**.
- No additional action is required while the review is in progress.
- Return later and refresh the page if needed.

## Step 5: Claim the Completion Credential

Once the assignment status becomes accepted or completed:

1. Click **Claim**.
2. Sign and submit the credential-claim transaction.
3. Wait for the dashboard to detect the claimed credential.

## Step 6: Open the Project Workspace

When the credential is detected, Step 3 completes and the **Open project workspace** button becomes available.

Click it to open the configured Andamio project in a new tab.

## Troubleshooting

### Wallet is connected on the wrong network

The app expects Testnet or Preprod for signing the onboarding transactions. Switch the wallet network and try again.

### Alias is already taken

Choose a different alias and mint the access token again. Aliases must be unique.

### The dashboard says confirmation is taking too long

Use **Refresh status** and give the chain and upstream state a little more time to sync.

### Step 2 is stuck on pending review

That means the prerequisite submission was recorded, but administrator review has not finished yet.

### The claim button does not appear

The prerequisite has to reach an accepted or completed status before the credential can be claimed.

### The project button does not appear

Project access is only enabled after the completion credential is detected and the project ID is configured for the app.
