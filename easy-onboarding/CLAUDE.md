# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Andamio Easy Onboarding - A Next.js application for Cardano wallet-based onboarding into Andamio programs. It uses MeshJS for Cardano wallet integration and proxies to the Andamio platform API for credential management.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

Note: `npm install` runs `postinstall` which patches libsodium-wrappers-sumo for Mesh compatibility.

## Environment Variables

Copy `.env.example` to `.env.local`. Required variables:

- `ANDAMIO_API_KEY` - Server-side API key for Andamio platform (required for all API routes)
- `NEXT_PUBLIC_ANDAMIO_ACCESS_TOKEN_POLICY_ID` - Policy ID for Andamio access tokens (enables Step 1)
- `NEXT_PUBLIC_ANDAMIO_COURSE_ID` - Prerequisite course identifier (enables Step 2)
- `NEXT_PUBLIC_ANDAMIO_SLT_HASH` - SLT hash for credential verification (enables Step 2)
- `NEXT_PUBLIC_ANDAMIO_PROJECT_ID` - Project ID for final workspace link (enables Step 3)

Server-side fallbacks `ANDAMIO_COURSE_ID` and `ANDAMIO_SLT_HASH` can override client values.

## Architecture

### Pages

- `/` - Landing page with wallet connection panel, redirects to dashboard on connect
- `/dashboard` - 3-step onboarding journey (access token, course verification, project access)

### API Routes (all proxy to preprod.api.andamio.io)

All routes require `ANDAMIO_API_KEY` and return `{ unsigned_tx }` for wallet signing:

- `POST /api/andamio/global/user/access-token/mint` - Mint new access token
- `POST /api/andamio/course/student/assignment/commit` - Accept terms/submit prerequisite
- `POST /api/andamio/course/student/credential/claim` - Claim completion credential
- `GET /api/andamio/users/[alias]/state` - Fetch user enrollment/completion state
- `GET /api/andamio/courses/[courseId]/students/[alias]/status` - Fetch assignment status

### Key Components

- `MeshContextProvider` - Client-side wrapper for `@meshsdk/react` MeshProvider
- `WalletConnectPanel` - Cardano wallet connection with network/address display
- Dashboard uses Mesh hooks: `useWallet`, `useAddress`, `useNetwork`, `useAssets`

### Transaction Flow

1. Dashboard calls API route with wallet addresses
2. API route forwards to Andamio with `x-api-key` header
3. API returns `unsigned_tx` (CBOR hex)
4. Client signs with `wallet.signTxReturnFullTx(unsignedTx, true)`
5. Client submits with `wallet.submitTx(signedTx)`
6. Dashboard polls for confirmation using exponential backoff

### Mesh/libsodium Compatibility

Next.js config includes webpack and turbopack aliases for libsodium-sumo modules. The postinstall script patches the ESM import path. If builds fail with libsodium errors, run `npm install` again.

## Styling

- Tailwind CSS v4 with custom CSS variables aligned to the Andamio brand palette
- Custom `.cta-primary` and `.cta-secondary` button classes in globals.css
- Inter/system font stack applied through CSS variables
