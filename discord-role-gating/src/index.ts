import express, { Request, Response } from 'express';
import { config } from './config.js';
import { getAuthUrl, getAccessToken, getDiscordUser, getAccountCreationDate } from './oauth2.js';
import { assignRole, startBot } from './discord.js';
import { checkNftOwnership, checkAccountAge, checkCredential } from './validators.js';
import {
  renderLandingPage,
  renderMessagePage,
  renderVerificationResultPage,
  renderWalletConnectPage,
  type VerificationStep,
} from './ui.js';

const app = express();
const port = config.PORT;

app.use(express.urlencoded({ extended: true }));

startBot();

const userSessions: Record<string, { discordId: string; username: string }> = {};

function createVerificationSteps(): VerificationStep[] {
  return [
    {
      title: 'Discord account age',
      summary: 'Confirm the connected Discord account is old enough to pass the minimum age rule.',
      status: 'blocked',
    },
    {
      title: 'Wallet asset validation',
      summary: 'Check the submitted Cardano address for an NFT under the configured policy ID.',
      status: 'blocked',
    },
    {
      title: 'Andamio credential',
      summary: 'Validate the required Andamio credential on one of the detected wallet handles.',
      status: 'blocked',
    },
    {
      title: 'Discord role assignment',
      summary: 'Grant the configured Discord role after every eligibility check passes.',
      status: 'blocked',
    },
  ];
}

function markStepComplete(steps: VerificationStep[], index: number, detail: string) {
  steps[index] = {
    ...steps[index],
    status: 'complete',
    detail,
  };
}

function markStepFailed(steps: VerificationStep[], index: number, detail: string) {
  steps[index] = {
    ...steps[index],
    status: 'failed',
    detail,
  };
}

function markRemainingBlocked(
  steps: VerificationStep[],
  startIndex: number,
  detail = 'This check did not run because an earlier requirement blocked the flow.',
) {
  for (let index = startIndex; index < steps.length; index += 1) {
    if (steps[index].status === 'blocked' && !steps[index].detail) {
      steps[index] = {
        ...steps[index],
        detail,
      };
    }
  }
}

function normalizeReason(reason: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(reason) && reason.length > 0) {
    return reason.join(', ');
  }

  if (typeof reason === 'string' && reason.trim().length > 0) {
    return reason.trim();
  }

  return fallback;
}

function extractAliases(reason: string | string[] | undefined): string[] {
  if (!Array.isArray(reason)) {
    return [];
  }

  return reason.filter((alias) => typeof alias === 'string' && alias.trim().length > 0);
}

function describeAliases(aliases: string[]): string {
  if (aliases.length === 0) {
    return 'A matching wallet asset was found on the submitted address.';
  }

  return `Detected wallet handles: ${aliases.join(', ')}`;
}

app.get('/', (_req: Request, res: Response) => {
  res.send(renderLandingPage());
});

app.get('/login', (_req: Request, res: Response) => {
  res.redirect(getAuthUrl());
});

app.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).send(
      renderMessagePage({
        title: 'Missing Discord code',
        eyebrow: 'Discord callback',
        heading: 'No authorization code was provided.',
        lead: 'The Discord OAuth callback did not include a valid code. Restart the login flow and try again.',
        tone: 'danger',
        primaryAction: { href: '/login', label: 'Login with Discord', variant: 'primary' },
        secondaryAction: { href: '/', label: 'Back to start', variant: 'secondary' },
      }),
    );
  }

  try {
    const accessToken = await getAccessToken(code);
    const user = await getDiscordUser(accessToken);

    const sessionId = Math.random().toString(36).substring(7);
    userSessions[sessionId] = { discordId: user.id, username: user.username };

    return res.send(renderWalletConnectPage(user.username, sessionId));
  } catch (error: any) {
    console.error('Callback error:', error?.response?.data || error?.message || error);
    return res.status(500).send(
      renderMessagePage({
        title: 'Discord verification error',
        eyebrow: 'Discord callback',
        heading: 'We could not finish the Discord login step.',
        lead: 'The verification portal reached Discord, but the callback flow failed before wallet validation could begin.',
        tone: 'danger',
        primaryAction: { href: '/login', label: 'Try Discord login again', variant: 'primary' },
        secondaryAction: { href: '/', label: 'Back to start', variant: 'secondary' },
      }),
    );
  }
});

app.post('/verify-final', async (req: Request, res: Response) => {
  const { sessionId, cardanoAddress } = req.body;
  const session = userSessions[sessionId];

  if (!session) {
    return res.status(400).send(
      renderMessagePage({
        title: 'Session expired',
        eyebrow: 'Verification session',
        heading: 'This verification session is no longer valid.',
        lead: 'The temporary session expired before the final checks ran. Restart the flow and reconnect your wallet.',
        tone: 'danger',
        primaryAction: { href: '/', label: 'Start over', variant: 'primary' },
        secondaryAction: { href: '/login', label: 'Login again', variant: 'secondary' },
      }),
    );
  }

  const { discordId, username } = session;
  const submittedAddress =
    typeof cardanoAddress === 'string' && cardanoAddress.trim().length > 0
      ? cardanoAddress.trim()
      : 'Wallet address unavailable';

  const steps = createVerificationSteps();
  let activeStepIndex = 0;

  const sendFailure = (statusCode: number, heading: string, lead: string) =>
    res.status(statusCode).send(
      renderVerificationResultPage({
        title: 'Verification blocked',
        eyebrow: 'Eligibility check',
        heading,
        lead,
        username,
        walletAddress: submittedAddress,
        steps,
        tone: 'danger',
        primaryAction: { href: '/', label: 'Start over', variant: 'primary' },
        secondaryAction: {
          href: 'https://github.com/Andamio-Platform/use-cases/tree/main/discord-role-gating',
          label: 'View source',
          variant: 'secondary',
        },
      }),
    );

  try {
    const creationDate = getAccountCreationDate(discordId);
    const ageResult = await checkAccountAge(creationDate);

    if (!ageResult.allowed) {
      markStepFailed(steps, 0, normalizeReason(ageResult.reason, 'The Discord account did not satisfy the minimum age requirement.'));
      markRemainingBlocked(steps, 1);
      return sendFailure(
        403,
        'Blocked at Discord account age',
        'The Discord identity step completed, but the account did not satisfy the minimum age rule for this gated role.',
      );
    }

    markStepComplete(steps, 0, 'The Discord account passed the minimum age requirement.');

    if (submittedAddress === 'Wallet address unavailable') {
      markStepFailed(steps, 1, 'No wallet address was submitted. Reconnect your Cardano wallet and try again.');
      markRemainingBlocked(steps, 2);
      return sendFailure(
        400,
        'Blocked before wallet validation',
        'The final verification request did not include a usable Cardano address, so the wallet-dependent checks could not run.',
      );
    }

    activeStepIndex = 1;
    const nftResult = await checkNftOwnership(submittedAddress);

    if (!nftResult.allowed) {
      markStepFailed(
        steps,
        1,
        normalizeReason(nftResult.reason, 'The connected wallet did not satisfy the NFT ownership requirement.'),
      );
      markRemainingBlocked(steps, 2);
      return sendFailure(
        403,
        'Blocked at wallet asset validation',
        'The Discord account passed, but the submitted wallet did not satisfy the NFT ownership rule required for this role.',
      );
    }

    const aliases = extractAliases(nftResult.reason);
    markStepComplete(steps, 1, describeAliases(aliases));

    activeStepIndex = 2;
    const credentialResult = await checkCredential(aliases, config.REQUIRED_CREDENTIAL as string);

    if (!credentialResult.allowed) {
      markStepFailed(
        steps,
        2,
        normalizeReason(credentialResult.reason, 'The required Andamio credential could not be confirmed.'),
      );
      markRemainingBlocked(steps, 3);
      return sendFailure(
        403,
        'Blocked at credential validation',
        'The wallet passed the asset check, but the required Andamio credential was not found on the detected handle set.',
      );
    }

    markStepComplete(
      steps,
      2,
      config.REQUIRED_CREDENTIAL
        ? `Required credential confirmed: ${config.REQUIRED_CREDENTIAL}`
        : 'The required Andamio credential was confirmed.',
    );

    activeStepIndex = 3;
    const roleResult = await assignRole(discordId);

    if (!roleResult.success) {
      markStepFailed(
        steps,
        3,
        roleResult.message || 'Discord rejected the role assignment request.',
      );
      return sendFailure(
        500,
        'Eligible, but role assignment failed',
        'All eligibility checks passed, but Discord did not accept the final role assignment request.',
      );
    }

    markStepComplete(steps, 3, `Role assigned successfully to ${username}.`);
    delete userSessions[sessionId];

    return res.send(
      renderVerificationResultPage({
        title: 'Role granted',
        eyebrow: 'Verification complete',
        heading: 'Role granted successfully',
        lead: 'Every eligibility check passed, and the Discord bot assigned the configured role.',
        username,
        walletAddress: submittedAddress,
        steps,
        tone: 'success',
        primaryAction: { href: '/', label: 'Verify another account', variant: 'primary' },
        secondaryAction: {
          href: 'https://github.com/Andamio-Platform/use-cases/tree/main/discord-role-gating',
          label: 'View source',
          variant: 'secondary',
        },
      }),
    );
  } catch (error: any) {
    console.error('Final verification error:', error);
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : 'An unexpected system error interrupted the verification flow.';

    if (steps[activeStepIndex] && steps[activeStepIndex].status === 'blocked') {
      markStepFailed(steps, activeStepIndex, message);
    }

    markRemainingBlocked(steps, activeStepIndex + 1);

    return sendFailure(
      500,
      'Verification could not be completed',
      'The verification flow stopped because of an unexpected system error during the final validation stage.',
    );
  }
});

app.listen(port, () => {
  console.log(`Web server listening at http://localhost:${port}`);
});
