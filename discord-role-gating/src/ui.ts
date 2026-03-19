export type PageAction = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
};

export type VerificationStepStatus = 'complete' | 'failed' | 'blocked';

export type VerificationStep = {
  title: string;
  summary: string;
  status: VerificationStepStatus;
  detail?: string;
};

type MessagePageOptions = {
  title: string;
  eyebrow: string;
  heading: string;
  lead: string;
  tone?: 'neutral' | 'success' | 'danger';
  primaryAction?: PageAction;
  secondaryAction?: PageAction;
};

type VerificationResultOptions = {
  title: string;
  eyebrow: string;
  heading: string;
  lead: string;
  username: string;
  walletAddress: string;
  steps: VerificationStep[];
  tone: 'success' | 'danger';
  primaryAction?: PageAction;
  secondaryAction?: PageAction;
};

const sharedStyles = `
  :root {
    --andamio-blue: #004e89;
    --andamio-blue-strong: #003a67;
    --andamio-blue-soft: #e8f1f8;
    --andamio-blue-bright: #3b82f6;
    --andamio-orange: #ff6b35;
    --andamio-orange-soft: #ffe4d8;
    --andamio-surface: #f6f9fc;
    --andamio-text: #0f1419;
    --andamio-muted: #5b6773;
    --andamio-success: #0f9f6e;
    --andamio-success-soft: #e8fbf3;
    --andamio-danger: #d64545;
    --andamio-danger-soft: #ffe9e9;
    --andamio-blocked: #94a3b8;
    --andamio-blocked-soft: #f1f5f9;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
    background: linear-gradient(165deg, #ffffff 0%, #f7fafc 56%, #edf5fb 100%);
    color: var(--andamio-text);
    font-family: Inter, "Avenir Next", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  }

  body {
    position: relative;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .andamio-shell {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    padding: 28px;
  }

  .andamio-shape {
    position: absolute;
    pointer-events: none;
    opacity: 0.9;
  }

  .andamio-shape--orange {
    right: -4rem;
    top: 4.5rem;
    width: 18rem;
    height: 18rem;
    background: var(--andamio-orange);
    clip-path: polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%);
  }

  .andamio-shape--blue {
    left: -5rem;
    bottom: -5rem;
    width: 20rem;
    height: 16rem;
    background: var(--andamio-blue);
    clip-path: polygon(0% 100%, 62% 68%, 100% 100%);
  }

  .andamio-shape--dot {
    left: 13%;
    top: 16%;
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 999px;
    background: var(--andamio-orange-soft);
  }

  .andamio-layout {
    position: relative;
    z-index: 1;
    width: min(1120px, 100%);
    margin: 0 auto;
    display: grid;
    gap: 24px;
    align-items: stretch;
    grid-template-columns: minmax(0, 1.06fr) minmax(320px, 0.94fr);
  }

  .andamio-layout--single {
    grid-template-columns: minmax(0, 1fr);
    max-width: 760px;
  }

  .andamio-card {
    border-radius: 32px;
    border: 1px solid rgba(0, 78, 137, 0.14);
    background: rgba(255, 255, 255, 0.88);
    padding: 32px;
    box-shadow: 0 22px 70px rgba(0, 78, 137, 0.12);
    backdrop-filter: blur(16px);
  }

  .andamio-card--accent {
    border-color: rgba(255, 255, 255, 0.16);
    background: linear-gradient(165deg, #004e89 0%, #035d99 52%, #0f1419 100%);
    color: #ffffff;
    box-shadow: 0 28px 85px rgba(0, 46, 84, 0.34);
  }

  .andamio-card--danger {
    border-color: rgba(214, 69, 69, 0.22);
    box-shadow: 0 22px 70px rgba(214, 69, 69, 0.12);
  }

  .andamio-eyebrow {
    display: inline-flex;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--andamio-orange);
  }

  .andamio-card--accent .andamio-eyebrow {
    color: #dcecff;
  }

  .andamio-title {
    margin: 14px 0 0;
    font-size: clamp(2.4rem, 4vw, 4.3rem);
    line-height: 1.04;
    letter-spacing: -0.04em;
  }

  .andamio-subtitle {
    margin: 18px 0 0;
    max-width: 56ch;
    font-size: 1rem;
    line-height: 1.72;
    color: var(--andamio-muted);
  }

  .andamio-card--accent .andamio-subtitle,
  .andamio-card--accent .andamio-copy {
    color: #e7f3ff;
  }

  .andamio-copy {
    margin: 18px 0 0;
    font-size: 0.98rem;
    line-height: 1.7;
    color: var(--andamio-muted);
  }

  .flow-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 28px 0 0;
  }

  .flow-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 10px 14px;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .flow-chip--complete {
    background: var(--andamio-success-soft);
    color: var(--andamio-success);
  }

  .flow-chip--current {
    background: var(--andamio-orange-soft);
    color: var(--andamio-orange);
  }

  .flow-chip--pending {
    background: rgba(255, 255, 255, 0.14);
    color: #e5ebff;
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  .cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 26px;
  }

  .cta {
    display: inline-flex;
    min-height: 46px;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    padding: 0 18px;
    font-size: 0.92rem;
    font-weight: 700;
    transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
  }

  .cta:hover {
    transform: translateY(-1px);
  }

  .cta--primary {
    border: 1px solid var(--andamio-orange);
    background: var(--andamio-orange);
    color: #ffffff;
    box-shadow: 0 12px 28px rgba(255, 107, 53, 0.26);
  }

  .cta--primary:hover {
    background: #e55c2a;
  }

  .cta--secondary {
    border: 1px solid rgba(0, 78, 137, 0.18);
    background: #ffffff;
    color: var(--andamio-blue);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  }

  .eyebrow-stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .status-banner {
    margin-top: 22px;
    border-radius: 18px;
    border: 1px solid rgba(0, 78, 137, 0.12);
    background: #ffffff;
    padding: 14px 16px;
    font-size: 0.92rem;
    line-height: 1.6;
    color: var(--andamio-text);
  }

  .status-banner[data-tone="info"] {
    border-color: rgba(0, 78, 137, 0.16);
    background: var(--andamio-blue-soft);
    color: var(--andamio-blue-strong);
  }

  .status-banner[data-tone="danger"] {
    border-color: rgba(214, 69, 69, 0.18);
    background: var(--andamio-danger-soft);
    color: #8c2323;
  }

  .wallet-list {
    display: grid;
    gap: 10px;
    margin-top: 24px;
  }

  .wallet-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    width: 100%;
    border: 1px solid rgba(0, 78, 137, 0.12);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.96);
    padding: 15px 16px;
    color: var(--andamio-text);
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .wallet-button:hover {
    transform: translateY(-1px);
    border-color: rgba(0, 78, 137, 0.26);
    box-shadow: 0 12px 32px rgba(0, 78, 137, 0.12);
  }

  .wallet-button__info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .wallet-button__icon {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    object-fit: contain;
    background: #ffffff;
  }

  .wallet-button__fallback {
    display: inline-flex;
    width: 28px;
    height: 28px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: linear-gradient(145deg, var(--andamio-blue) 0%, #0b7abf 100%);
    color: #ffffff;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .wallet-button__name {
    font-size: 0.95rem;
    font-weight: 700;
  }

  .wallet-button__meta {
    font-size: 0.78rem;
    color: var(--andamio-muted);
  }

  .result-progress {
    margin-top: 24px;
  }

  .result-progress__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
    font-size: 0.88rem;
    color: var(--andamio-muted);
  }

  .result-progress__track {
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(15, 20, 25, 0.08);
  }

  .result-progress__fill {
    height: 100%;
    border-radius: 999px;
    background: var(--andamio-orange);
  }

  .result-progress__fill--success {
    background: var(--andamio-success);
  }

  .result-progress__fill--danger {
    background: var(--andamio-danger);
  }

  .verification-steps {
    position: relative;
    margin: 30px 0 0;
    padding: 0;
    list-style: none;
  }

  .verification-steps::before {
    content: "";
    position: absolute;
    top: 1rem;
    bottom: 1rem;
    left: 1.1rem;
    width: 1px;
    background: rgba(15, 20, 25, 0.12);
  }

  .verification-step {
    position: relative;
    padding-left: 68px;
  }

  .verification-step + .verification-step {
    margin-top: 28px;
  }

  .verification-step__marker {
    position: absolute;
    left: 0;
    top: 0;
    display: inline-flex;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 800;
    border: 1px solid transparent;
    background: var(--andamio-blocked-soft);
    color: var(--andamio-blocked);
  }

  .verification-step[data-status="complete"] .verification-step__marker {
    background: var(--andamio-success-soft);
    color: var(--andamio-success);
  }

  .verification-step[data-status="failed"] .verification-step__marker {
    background: var(--andamio-danger-soft);
    color: var(--andamio-danger);
  }

  .verification-step__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .verification-step__title {
    font-size: 1.08rem;
    font-weight: 700;
  }

  .verification-step__status {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .verification-step[data-status="complete"] .verification-step__status {
    background: var(--andamio-success-soft);
    color: var(--andamio-success);
  }

  .verification-step[data-status="failed"] .verification-step__status {
    background: var(--andamio-danger-soft);
    color: var(--andamio-danger);
  }

  .verification-step[data-status="blocked"] .verification-step__status {
    background: var(--andamio-blocked-soft);
    color: #64748b;
  }

  .verification-step__summary {
    margin: 10px 0 0;
    font-size: 0.94rem;
    line-height: 1.65;
    color: var(--andamio-muted);
  }

  .verification-step__detail {
    margin: 14px 0 0;
    border-radius: 16px;
    padding: 12px 14px;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .verification-step[data-status="complete"] .verification-step__detail {
    background: var(--andamio-success-soft);
    color: #17644c;
  }

  .verification-step[data-status="failed"] .verification-step__detail {
    background: var(--andamio-danger-soft);
    color: #8c2323;
  }

  .verification-step[data-status="blocked"] .verification-step__detail {
    background: var(--andamio-blocked-soft);
    color: #526173;
  }

  .meta-grid {
    display: grid;
    gap: 14px;
    margin-top: 22px;
  }

  .meta-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
  }

  .meta-row:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .meta-label {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(231, 243, 255, 0.72);
  }

  .meta-value {
    max-width: 58%;
    text-align: right;
    font-size: 0.96rem;
    line-height: 1.55;
    color: #ffffff;
    word-break: break-word;
  }

  .summary-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 9px 14px;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .summary-pill--success {
    background: rgba(15, 159, 110, 0.16);
    color: #d8fff0;
    border: 1px solid rgba(15, 159, 110, 0.28);
  }

  .summary-pill--danger {
    background: rgba(255, 107, 53, 0.14);
    color: #ffe5d8;
    border: 1px solid rgba(255, 107, 53, 0.24);
  }

  .support-note {
    margin-top: 18px;
    font-size: 0.84rem;
    line-height: 1.6;
    color: rgba(231, 243, 255, 0.74);
  }

  .support-note a {
    color: #ffffff;
    text-decoration: underline;
    text-underline-offset: 0.16em;
  }

  @media (max-width: 920px) {
    .andamio-shell {
      padding: 18px;
    }

    .andamio-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .andamio-card {
      padding: 24px;
      border-radius: 26px;
    }

    .meta-value {
      max-width: 62%;
    }
  }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shortenMiddle(value: string, head = 14, tail = 10): string {
  if (!value || value.length <= head + tail + 3) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function renderActions(primaryAction?: PageAction, secondaryAction?: PageAction): string {
  const actions = [primaryAction, secondaryAction].filter((action): action is PageAction => Boolean(action));

  if (actions.length === 0) {
    return '';
  }

  return `
    <div class="cta-row">
      ${actions
        .map(
          (action) => `
            <a
              href="${escapeHtml(action.href)}"
              class="cta cta--${action.variant === 'secondary' ? 'secondary' : 'primary'}"
            >
              ${escapeHtml(action.label)}
            </a>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <main class="andamio-shell">
      <div class="andamio-shape andamio-shape--orange"></div>
      <div class="andamio-shape andamio-shape--blue"></div>
      <div class="andamio-shape andamio-shape--dot"></div>
      ${body}
    </main>
  </body>
</html>`;
}

export function renderLandingPage(): string {
  return renderDocument(
    'Discord Role Verification',
    `
      <div class="andamio-layout">
        <section class="andamio-card">
          <span class="andamio-eyebrow">Discord role gating</span>
          <h1 class="andamio-title">Role verification with a visible eligibility flow.</h1>
          <p class="andamio-subtitle">
            This portal verifies a Discord identity, checks a connected Cardano wallet for the
            required NFT, confirms the configured Andamio credential, and assigns the Discord role
            only when every step passes.
          </p>

          <div class="flow-chip-row">
            <span class="flow-chip flow-chip--current">01 Login with Discord</span>
            <span class="flow-chip flow-chip--pending">02 Connect Cardano wallet</span>
            <span class="flow-chip flow-chip--pending">03 Validate and assign role</span>
          </div>

          <p class="andamio-copy">
            Use this page when you want the verification result to be explicit. Instead of a single
            plaintext response, the final screen will show which checks passed and exactly where the
            flow stopped if a requirement fails.
          </p>

          ${renderActions(
            { href: '/login', label: 'Login with Discord', variant: 'primary' },
            { href: 'https://github.com/Andamio-Platform/use-cases/tree/main/discord-role-gating', label: 'View source', variant: 'secondary' },
          )}
        </section>

        <section class="andamio-card andamio-card--accent">
          <span class="andamio-eyebrow">What gets checked</span>
          <h2 class="andamio-title" style="font-size: clamp(2rem, 3.5vw, 3.2rem);">
            A gated flow, not a blind submit.
          </h2>
          <p class="andamio-subtitle">
            The verification route inspects four concrete steps:
          </p>

          <div class="meta-grid">
            <div class="meta-row">
              <div class="meta-label">Step 1</div>
              <div class="meta-value">Discord account age requirement</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Step 2</div>
              <div class="meta-value">NFT ownership on the submitted Cardano address</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Step 3</div>
              <div class="meta-value">Required Andamio credential on one of the detected handles</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Step 4</div>
              <div class="meta-value">Discord role assignment through the bot</div>
            </div>
          </div>

          <p class="support-note">
            If a requirement fails, later steps are shown as blocked rather than pretending the
            rest of the flow ran.
          </p>
        </section>
      </div>
    `,
  );
}

export function renderWalletConnectPage(username: string, sessionId: string): string {
  const safeUsername = escapeHtml(username);
  const safeSessionId = escapeHtml(sessionId);

  return renderDocument(
    'Connect Cardano Wallet',
    `
      <div class="andamio-layout">
        <section class="andamio-card">
          <span class="andamio-eyebrow">Wallet connection</span>
          <h1 class="andamio-title" style="font-size: clamp(2.2rem, 3.8vw, 3.6rem);">
            Connect the wallet you want to validate.
          </h1>
          <p class="andamio-subtitle">
            Logged in as <strong>${safeUsername}</strong>. Select a Cardano wallet below and the
            portal will use its change address for the NFT and credential checks.
          </p>

          <div class="flow-chip-row">
            <span class="flow-chip flow-chip--complete">01 Discord login complete</span>
            <span class="flow-chip flow-chip--current">02 Connect Cardano wallet</span>
            <span class="flow-chip flow-chip--pending">03 Validate and assign role</span>
          </div>

          <div class="status-banner" id="status" data-tone="info">
            Initializing wallet discovery...
          </div>

          <p class="andamio-copy">
            If no extension is listed, make sure the wallet is installed, enabled in the browser,
            and allowed on this site.
          </p>
        </section>

        <section class="andamio-card andamio-card--accent">
          <span class="andamio-eyebrow">Choose a wallet</span>
          <h2 class="andamio-title" style="font-size: clamp(2rem, 3.3vw, 3rem);">
            Wallet discovery
          </h2>
          <p class="andamio-subtitle">
            Once a wallet is connected, the final verification screen will display each validation
            step and show the first blocking condition if the flow cannot complete.
          </p>

          <div id="wallet-list" class="wallet-list">
            <div class="status-banner" data-tone="info">Looking for installed wallets...</div>
          </div>

          <form id="verify-form" action="/verify-final" method="POST" style="display: none;">
            <input type="hidden" name="sessionId" value="${safeSessionId}">
            <input type="hidden" name="cardanoAddress" id="cardanoAddress">
          </form>

          <p class="support-note">
            Need to restart the flow? <a href="/">Go back to the start</a>.
          </p>
        </section>
      </div>

      <script type="module">
        const walletListDiv = document.getElementById('wallet-list');
        const status = document.getElementById('status');

        function setStatus(message, tone = 'info') {
          status.dataset.tone = tone;
          status.textContent = message;
        }

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
              const BrowserWallet = mesh.BrowserWallet || mesh.default?.BrowserWallet;
              if (BrowserWallet) {
                console.log('Mesh SDK loaded successfully from:', url);
                return BrowserWallet;
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              console.warn('Failed to load bundle from ' + url + ':', message);
            }
          }

          return null;
        }

        function getRawWallets() {
          if (!window.cardano) {
            return [];
          }

          return Object.keys(window.cardano)
            .filter((id) => window.cardano[id].apiVersion)
            .map((id) => ({
              id,
              name: window.cardano[id].name || id,
              icon: window.cardano[id].icon,
              version: window.cardano[id].apiVersion
            }));
        }

        function renderWalletButton(wallet, onClick) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'wallet-button';
          const info = document.createElement('div');
          info.className = 'wallet-button__info';

          if (typeof wallet.icon === 'string' && wallet.icon.trim().length > 0) {
            const icon = document.createElement('img');
            icon.src = wallet.icon;
            icon.alt = '';
            icon.className = 'wallet-button__icon';
            info.appendChild(icon);
          } else {
            const fallback = document.createElement('span');
            fallback.className = 'wallet-button__fallback';
            fallback.textContent = String(wallet.name || wallet.id || 'W').trim().charAt(0).toUpperCase() || 'W';
            info.appendChild(fallback);
          }

          const text = document.createElement('div');
          const name = document.createElement('div');
          const label = String(wallet.name || wallet.id || 'Wallet').trim();
          name.className = 'wallet-button__name';
          name.textContent = label.charAt(0).toUpperCase() + label.slice(1);

          const meta = document.createElement('div');
          meta.className = 'wallet-button__meta';
          meta.textContent = 'Browser extension wallet';

          text.appendChild(name);
          text.appendChild(meta);
          info.appendChild(text);

          const version = document.createElement('div');
          version.className = 'wallet-button__meta';
          version.textContent = wallet.version ? 'v' + wallet.version : 'Available';

          btn.appendChild(info);
          btn.appendChild(version);
          btn.onclick = onClick;
          return btn;
        }

        function renderWalletState(message, tone = 'info') {
          const banner = document.createElement('div');
          banner.className = 'status-banner';
          banner.dataset.tone = tone;
          banner.textContent = message;
          walletListDiv.replaceChildren(banner);
        }

        function hexToBytes(hex) {
          const normalized = typeof hex === 'string' ? hex.trim() : '';
          const pairs = normalized.match(/.{1,2}/g);
          if (!pairs) {
            return new Uint8Array();
          }

          return Uint8Array.from(pairs.map((pair) => Number.parseInt(pair, 16)));
        }

        async function start() {
          try {
            setStatus('Initializing wallet discovery...', 'info');

            const BrowserWallet = await loadMesh();
            await new Promise((resolve) => setTimeout(resolve, 1000));

            let wallets = [];
            if (BrowserWallet) {
              const installedWallets = await Promise.resolve(BrowserWallet.getInstalledWallets());
              wallets = Array.isArray(installedWallets) ? installedWallets : [];
            } else {
              console.warn('Mesh library failed to load, falling back to raw discovery');
              wallets = getRawWallets();
            }

            if (!wallets || wallets.length === 0) {
              renderWalletState(
                'No wallets detected. Install or enable a Cardano browser wallet, then refresh this page.',
                'danger',
              );
              setStatus('No Cardano extensions were detected in this browser.', 'danger');
              return;
            }

            setStatus('Select the Cardano wallet you want to verify.', 'info');
            walletListDiv.replaceChildren();

            wallets.forEach((wallet) => {
              walletListDiv.appendChild(
                renderWalletButton(wallet, () => connect(BrowserWallet, wallet.id || wallet.name))
              );
            });
          } catch (error) {
            console.error('Wallet discovery error:', error);
            setStatus('An unexpected error occurred while loading wallet options.', 'danger');
          }
        }

        async function connect(BrowserWallet, walletId) {
          try {
            setStatus('Connecting to wallet...', 'info');

            let address = '';
            if (BrowserWallet) {
              const wallet = await BrowserWallet.enable(walletId);
              setStatus('Wallet connected. Retrieving address...', 'info');
              address = await wallet.getChangeAddress();
            } else {
              const provider = window.cardano && window.cardano[walletId];
              if (!provider || typeof provider.enable !== 'function') {
                throw new Error('The selected wallet is no longer available in this browser.');
              }

              const api = await provider.enable();
              setStatus('Wallet connected. Retrieving address...', 'info');
              const hexAddress = await api.getChangeAddress();

              if (window.CardanoWasm) {
                const cslAddress = window.CardanoWasm.Address.from_bytes(
                  hexToBytes(hexAddress)
                );
                address = cslAddress.to_bech32();
              } else if (window.MeshSDK || window.Mesh) {
                const sdk = window.MeshSDK || window.Mesh;
                address = sdk.resolveAddress ? sdk.resolveAddress(hexAddress) : hexAddress;
              } else {
                address = hexAddress;
                console.warn('No decoding library available; sending raw hex to the server.');
              }
            }

            if (!address) {
              throw new Error('Could not retrieve a valid wallet address.');
            }

            document.getElementById('cardanoAddress').value = address;
            setStatus('Wallet connected. Running validation checks...', 'info');
            document.getElementById('verify-form').submit();
          } catch (error) {
            console.error('Connection error:', error);
            const message =
              error && typeof error === 'object' && 'info' in error && typeof error.info === 'string'
                ? error.info
                : error instanceof Error
                  ? error.message
                  : 'Connection refused';

            setStatus('Connection failed: ' + message, 'danger');
          }
        }

        start();
      </script>
      <script src="https://cdn.jsdelivr.net/npm/@emurgo/cardano-serialization-lib-browser/cardano_serialization_lib.js"></script>
    `,
  );
}

export function renderMessagePage(options: MessagePageOptions): string {
  const toneClass = options.tone === 'danger' ? ' andamio-card--danger' : '';

  return renderDocument(
    options.title,
    `
      <div class="andamio-layout andamio-layout--single">
        <section class="andamio-card${toneClass}">
          <span class="andamio-eyebrow">${escapeHtml(options.eyebrow)}</span>
          <h1 class="andamio-title" style="font-size: clamp(2.2rem, 4vw, 3.4rem);">
            ${escapeHtml(options.heading)}
          </h1>
          <p class="andamio-subtitle">${escapeHtml(options.lead)}</p>
          ${renderActions(options.primaryAction, options.secondaryAction)}
        </section>
      </div>
    `,
  );
}

export function renderVerificationResultPage(options: VerificationResultOptions): string {
  const completedSteps = options.steps.filter((step) => step.status === 'complete').length;
  const blockedSteps = options.steps.filter((step) => step.status === 'blocked').length;
  const failedStep = options.steps.find((step) => step.status === 'failed');
  const progressPercent = Math.round((completedSteps / options.steps.length) * 100);
  const summaryToneClass = options.tone === 'success' ? 'summary-pill--success' : 'summary-pill--danger';
  const progressToneClass =
    options.tone === 'success' ? 'result-progress__fill--success' : 'result-progress__fill--danger';
  const summaryLabel = options.tone === 'success' ? 'Role granted' : 'Verification blocked';

  return renderDocument(
    options.title,
    `
      <div class="andamio-layout">
        <section class="andamio-card">
          <span class="andamio-eyebrow">${escapeHtml(options.eyebrow)}</span>
          <h1 class="andamio-title" style="font-size: clamp(2.2rem, 4vw, 3.7rem);">
            ${escapeHtml(options.heading)}
          </h1>
          <p class="andamio-subtitle">${escapeHtml(options.lead)}</p>

          <div class="result-progress">
            <div class="result-progress__meta">
              <span>Validation progress</span>
              <span>${completedSteps}/${options.steps.length} complete</span>
            </div>
            <div class="result-progress__track">
              <div class="result-progress__fill ${progressToneClass}" style="width: ${progressPercent}%;"></div>
            </div>
          </div>

          <ol class="verification-steps">
            ${options.steps
              .map((step, index) => {
                const detail = step.detail || 'This check did not run because an earlier requirement blocked the flow.';
                const statusLabel =
                  step.status === 'complete'
                    ? 'Complete'
                    : step.status === 'failed'
                      ? 'Failed'
                      : 'Blocked';

                return `
                  <li class="verification-step" data-status="${step.status}">
                    <span class="verification-step__marker">${index + 1}</span>
                    <div class="verification-step__header">
                      <div class="verification-step__title">${escapeHtml(step.title)}</div>
                      <span class="verification-step__status">${statusLabel}</span>
                    </div>
                    <p class="verification-step__summary">${escapeHtml(step.summary)}</p>
                    <div class="verification-step__detail">${escapeHtml(detail)}</div>
                  </li>
                `;
              })
              .join('')}
          </ol>
        </section>

        <aside class="andamio-card andamio-card--accent">
          <span class="summary-pill ${summaryToneClass}">${summaryLabel}</span>
          <h2 class="andamio-title" style="font-size: clamp(2rem, 3.4vw, 3rem);">
            Eligibility snapshot
          </h2>
          <p class="andamio-subtitle">
            The panel on the left shows every validation stage in order. The first failed step is
            highlighted, and any later checks are marked as blocked.
          </p>

          <div class="meta-grid">
            <div class="meta-row">
              <div class="meta-label">Discord user</div>
              <div class="meta-value">${escapeHtml(options.username)}</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Wallet</div>
              <div class="meta-value">${escapeHtml(shortenMiddle(options.walletAddress))}</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Completed steps</div>
              <div class="meta-value">${completedSteps} of ${options.steps.length}</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Blocked later steps</div>
              <div class="meta-value">${blockedSteps}</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Stopping point</div>
              <div class="meta-value">${escapeHtml(failedStep?.title || (options.tone === 'success' ? 'No blocking step' : 'Unavailable'))}</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Result</div>
              <div class="meta-value">${summaryLabel}</div>
            </div>
          </div>

          ${renderActions(options.primaryAction, options.secondaryAction)}

          <p class="support-note">
            If this result looks wrong, restart the flow and verify that the selected wallet holds
            the expected asset and credential before trying again.
          </p>
        </aside>
      </div>
    `,
  );
}
