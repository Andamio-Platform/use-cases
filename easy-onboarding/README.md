# Andamio Easy Onboarding

Andamio Easy Onboarding is a Next.js app that guides a Cardano wallet holder through a simple three-step onboarding flow:

1. Detect or mint an Andamio access token
2. Submit the prerequisite acknowledgement and wait for review
3. Claim the completion credential and open the target project workspace

The UI is built with the App Router, Tailwind CSS v4, and `@meshsdk/react`. Server routes proxy to Andamio preprod APIs and return unsigned transactions for the connected wallet to sign and submit.

## Features

- Wallet-first onboarding flow with Mesh wallet integration
- Automatic detection of an existing Andamio access token
- Access-token mint flow when no token is present
- Prerequisite submission and assignment-status polling
- Credential claim flow after review is accepted
- Direct handoff to the configured Andamio project workspace

## Requirements

- A Node.js version supported by Next.js 16
- npm
- A Cardano wallet compatible with Mesh
- An Andamio API key and the relevant policy/course/project identifiers

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values for your environment.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANDAMIO_API_KEY` | Yes | Server-side API key used by all proxy routes |
| `NEXT_PUBLIC_ANDAMIO_ACCESS_TOKEN_POLICY_ID` | Yes | Policy ID used to detect or mint the access token |
| `NEXT_PUBLIC_ANDAMIO_COURSE_ID` | Yes | Prerequisite course ID used for enrollment and status checks |
| `NEXT_PUBLIC_ANDAMIO_SLT_HASH` | Yes | Credential hash used to confirm completion |
| `NEXT_PUBLIC_ANDAMIO_PROJECT_ID` | Yes | Project ID used to build the final workspace link |
| `ANDAMIO_COURSE_ID` | Optional | Server-side fallback for the course ID |
| `ANDAMIO_SLT_HASH` | Optional | Server-side fallback for the SLT hash |

If one of the public configuration values is missing, the corresponding step in the dashboard will show a configuration warning instead of proceeding.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm install` runs `scripts/fix-mesh-libsodium.mjs`, which patches a libsodium import used by Mesh in this project setup.

## Verification Commands

```bash
npm run lint
npm run build
```

## Onboarding Flow

### Step 1: Access token

- The dashboard checks the connected wallet for an asset under `NEXT_PUBLIC_ANDAMIO_ACCESS_TOKEN_POLICY_ID`
- If a token is found, the holder alias is derived from the asset name
- If no token is found, the user can mint one by choosing a unique alias

### Step 2: Prerequisite verification

- The app reads the user state from Andamio
- If the user is not enrolled yet, they can submit the prerequisite acknowledgement
- If the user is already enrolled, the app polls course status
- Once the assignment is accepted or completed, the user can claim the completion credential

### Step 3: Project access

- After the credential is detected, the dashboard enables a link to the configured project workspace

## API Routes

All app routes proxy to Andamio preprod endpoints.

- `POST /api/andamio/global/user/access-token/mint`
  Creates an unsigned transaction for minting an access token.
- `POST /api/andamio/course/student/assignment/commit`
  Creates an unsigned transaction for submitting the prerequisite acknowledgement.
- `POST /api/andamio/course/student/credential/claim`
  Creates an unsigned transaction for claiming the completion credential.
- `GET /api/andamio/users/[alias]/state`
  Fetches user-level course and project state.
- `GET /api/andamio/courses/[courseId]/students/[alias]/status`
  Fetches assignment status for the configured course.

## Project Structure

- `src/app/page.tsx`
  Landing page with the wallet-connect panel
- `src/app/dashboard/page.tsx`
  Main onboarding dashboard
- `src/components/wallet-connect-panel.tsx`
  Shared wallet status panel used on the landing page
- `src/app/api/andamio/...`
  Server routes that proxy to the Andamio API
- `scripts/fix-mesh-libsodium.mjs`
  Postinstall patch for Mesh/libsodium compatibility

## Notes

- The project currently targets Andamio preprod URLs.
- The dashboard polls transaction-related state with exponential backoff until the expected state is detected or the timeout window is reached.
- Markdown docs for this project can be imported directly into the Nextra site, so the README and user guide remain the single source of truth.
