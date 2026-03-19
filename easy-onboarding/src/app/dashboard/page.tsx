"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CardanoWallet, useAddress, useAssets, useNetwork, useWallet } from "@meshsdk/react";

const accessTokenPolicyId = process.env.NEXT_PUBLIC_ANDAMIO_ACCESS_TOKEN_POLICY_ID?.trim() ?? "";
const andamioStateApiBase = "/api/andamio/users";
const andamioCourseStatusApiBase = "/api/andamio/courses";
const andamioTermsCommitApi = "/api/andamio/course/student/assignment/commit";
const andamioCredentialClaimApi = "/api/andamio/course/student/credential/claim";
const andamioAccessTokenMintApi = "/api/andamio/global/user/access-token/mint";
const andamioCourseId = process.env.NEXT_PUBLIC_ANDAMIO_COURSE_ID?.trim() ?? "";
const andamioSltHash = process.env.NEXT_PUBLIC_ANDAMIO_SLT_HASH?.trim() ?? "";
const andamioProjectId = process.env.NEXT_PUBLIC_ANDAMIO_PROJECT_ID?.trim() ?? "";

type AndamioCompletedCourse = {
  claimed_credentials: string[];
  course_id: string;
};

type AndamioUserState = {
  alias: string;
  completed_courses: AndamioCompletedCourse[];
  completed_projects: unknown[];
  enrolled_courses: string[];
  joined_projects: string[];
};

type AndamioCourseAssignmentStatus = {
  alias: string;
  content: string;
  slt_hash: string;
  status: string;
};

type AndamioCourseStudentStatus = {
  alias: string;
  completed_assignments: AndamioCourseAssignmentStatus[];
  course_id: string;
  current_assignment: AndamioCourseAssignmentStatus | null;
};

type WalletAssetLike = {
  policyId: string;
  assetName: string;
  quantity: string;
};

type TxConfirmationAction = "mint" | "terms" | "claim";
type TxConfirmationPhase = "confirming" | "confirmed" | "timeout";

type TxConfirmationState = {
  action: TxConfirmationAction;
  txHash: string;
  startedAt: number;
  attempts: number;
  phase: TxConfirmationPhase;
};

const CONFIRMATION_TIMEOUT_MS = 3 * 60 * 1000;
const CONFIRMATION_BACKOFF_MS = [1500, 2500, 4000, 6500, 10000, 15000];

function shortenAddress(address: string) {
  if (address.length < 20) {
    return address;
  }

  return `${address.slice(0, 12)}...${address.slice(-8)}`;
}

function networkLabel(networkId: number | undefined) {
  if (networkId === 1) {
    return "Mainnet";
  }

  if (networkId === 0) {
    return "Testnet";
  }

  return "Unknown";
}

function hasPositiveQuantity(quantity: string) {
  try {
    return BigInt(quantity) > BigInt(0);
  } catch {
    return quantity !== "0";
  }
}

function isClaimableAssignmentStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized === "accepted" || normalized === "complete" || normalized === "completed";
}

function toWalletAssetLike(asset: unknown): WalletAssetLike | null {
  if (!asset || typeof asset !== "object") {
    return null;
  }

  const candidate = asset as Partial<WalletAssetLike> & { unit?: unknown };
  if (
    typeof candidate.policyId !== "string" ||
    typeof candidate.assetName !== "string" ||
    typeof candidate.quantity !== "string"
  ) {
    if (typeof candidate.unit === "string" && typeof candidate.quantity === "string") {
      const unit = candidate.unit.trim();
      if (unit === "lovelace" || unit.length <= 56) {
        return null;
      }

      return {
        policyId: unit.slice(0, 56),
        assetName: unit.slice(56),
        quantity: candidate.quantity,
      };
    }

    return null;
  }

  return {
    policyId: candidate.policyId,
    assetName: candidate.assetName,
    quantity: candidate.quantity,
  };
}

function isHex(value: string) {
  return value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value);
}

function decodeHexString(hex: string) {
  const pairs = hex.match(/.{1,2}/g);
  if (!pairs) {
    return "";
  }

  const bytes = Uint8Array.from(pairs.map((pair) => Number.parseInt(pair, 16)));
  return new TextDecoder().decode(bytes);
}

function formatAssetName(assetName: string) {
  if (!assetName) {
    return "token holder";
  }

  const normalized = assetName.startsWith("0x") ? assetName.slice(2) : assetName;
  if (isHex(normalized)) {
    try {
      const decoded = decodeHexString(normalized).replace(/\0/g, "").trim();
      if (decoded && /^[\x20-\x7E]+$/.test(decoded)) {
        return decoded;
      }
    } catch {
      return normalized;
    }
  }

  return normalized;
}

function normalizeUserState(payload: unknown, fallbackAlias: string): AndamioUserState {
  if (!payload || typeof payload !== "object") {
    return {
      alias: fallbackAlias,
      completed_courses: [],
      completed_projects: [],
      enrolled_courses: [],
      joined_projects: [],
    };
  }

  const state = payload as Partial<AndamioUserState>;
  return {
    alias: typeof state.alias === "string" ? state.alias : fallbackAlias,
    completed_courses: Array.isArray(state.completed_courses) ? state.completed_courses : [],
    completed_projects: Array.isArray(state.completed_projects) ? state.completed_projects : [],
    enrolled_courses: Array.isArray(state.enrolled_courses) ? state.enrolled_courses : [],
    joined_projects: Array.isArray(state.joined_projects) ? state.joined_projects : [],
  };
}

function normalizeCourseStudentStatus(
  payload: unknown,
  fallbackAlias: string,
  fallbackCourseId: string,
): AndamioCourseStudentStatus {
  if (!payload || typeof payload !== "object") {
    return {
      alias: fallbackAlias,
      completed_assignments: [],
      course_id: fallbackCourseId,
      current_assignment: null,
    };
  }

  const status = payload as Partial<AndamioCourseStudentStatus>;
  return {
    alias: typeof status.alias === "string" ? status.alias : fallbackAlias,
    completed_assignments: Array.isArray(status.completed_assignments)
      ? status.completed_assignments
      : [],
    course_id: typeof status.course_id === "string" ? status.course_id : fallbackCourseId,
    current_assignment:
      status.current_assignment && typeof status.current_assignment === "object"
        ? status.current_assignment
        : null,
  };
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "Unexpected error.";
    }
  }

  return "Unexpected error.";
}

export default function DashboardPage() {
  const { connected, connecting, wallet } = useWallet();
  const address = useAddress();
  const networkId = useNetwork();
  const assets = useAssets();
  const [userState, setUserState] = useState<AndamioUserState | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsSubmitting, setTermsSubmitting] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [termsTxHash, setTermsTxHash] = useState<string | null>(null);
  const [mintAlias, setMintAlias] = useState("");
  const [mintSubmitting, setMintSubmitting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [courseStatus, setCourseStatus] = useState<AndamioCourseStudentStatus | null>(null);
  const [courseStatusLoading, setCourseStatusLoading] = useState(false);
  const [courseStatusError, setCourseStatusError] = useState<string | null>(null);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [txConfirmation, setTxConfirmation] = useState<TxConfirmationState | null>(null);
  const [walletAssetsSnapshot, setWalletAssetsSnapshot] = useState<WalletAssetLike[] | null>(null);

  const policyConfigured = accessTokenPolicyId.length > 0;
  const resolvedAssets = walletAssetsSnapshot ?? assets;
  const accessTokenAsset = policyConfigured
    ? resolvedAssets?.find(
      (asset) => asset.policyId === accessTokenPolicyId && hasPositiveQuantity(asset.quantity),
    )
    : undefined;
  const hasAccessToken = Boolean(accessTokenAsset);
  const accessTokenName = accessTokenAsset ? formatAssetName(accessTokenAsset.assetName) : "";
  const accessTokenAlias = accessTokenName.length > 1 ? accessTokenName.slice(1).trim() : "";
  const completedCoursesCount = userState?.completed_courses.length ?? 0;
  const isEnrolledInConfiguredCourse = Boolean(
    andamioCourseId && userState?.enrolled_courses.includes(andamioCourseId),
  );
  const step1Complete = hasAccessToken;
  const step2ConfigReady = andamioCourseId.length > 0 && andamioSltHash.length > 0;
  const hasConfiguredCourseCredential = Boolean(
    step2ConfigReady &&
    userState?.completed_courses.some(
      (course) =>
        course.course_id === andamioCourseId &&
        Array.isArray(course.claimed_credentials) &&
        course.claimed_credentials.includes(andamioSltHash),
    ),
  );
  const step2Complete = step1Complete && hasConfiguredCourseCredential;
  const showStep2a =
    step1Complete &&
    !step2Complete &&
    !isEnrolledInConfiguredCourse &&
    completedCoursesCount === 0;
  const showStep2b = step1Complete && !step2Complete && isEnrolledInConfiguredCourse;
  const currentAssignmentRawStatus = courseStatus?.current_assignment?.status?.trim() ?? "";
  const currentAssignmentStatus = currentAssignmentRawStatus.toLowerCase();
  const claimableAssignmentStatus =
    [currentAssignmentRawStatus, ...(courseStatus?.completed_assignments ?? []).map((assignment) => assignment.status ?? "")]
      .map((status) => status.trim())
      .find((status) => isClaimableAssignmentStatus(status)) ?? "";
  const shouldShowPendingNotice = showStep2b && currentAssignmentStatus === "pending";
  const shouldShowClaimReceipt = showStep2b && claimableAssignmentStatus.length > 0;
  const shouldShowAcceptTerms = showStep2a && !acceptedTerms;
  const hasProjectId = andamioProjectId.length > 0;
  const projectUrl = hasProjectId
    ? `https://preprod.app.andamio.io/project/${encodeURIComponent(andamioProjectId)}`
    : "";
  const step3Complete = step2Complete && hasProjectId;
  const txActionLabel =
    txConfirmation?.action === "mint"
      ? "Access token mint"
      : txConfirmation?.action === "terms"
        ? "Terms acceptance"
        : txConfirmation?.action === "claim"
          ? "Credential claim"
          : "";
  const isMintConfirming = txConfirmation?.action === "mint" && txConfirmation.phase === "confirming";
  const isTermsConfirming = txConfirmation?.action === "terms" && txConfirmation.phase === "confirming";
  const isClaimConfirming = txConfirmation?.action === "claim" && txConfirmation.phase === "confirming";

  const readWalletAssets = useCallback(
    async (options?: { updateState?: boolean }) => {
      if (!connected) {
        if (options?.updateState) {
          setWalletAssetsSnapshot(null);
        }
        return [] as WalletAssetLike[];
      }

      try {
        const walletAssets = await wallet.getBalanceMesh();
        const normalizedAssets = Array.isArray(walletAssets)
          ? walletAssets
            .map((asset) => toWalletAssetLike(asset))
            .filter((asset): asset is WalletAssetLike => asset !== null)
          : [];

        if (options?.updateState) {
          setWalletAssetsSnapshot(normalizedAssets);
        }

        return normalizedAssets;
      } catch {
        if (options?.updateState) {
          setWalletAssetsSnapshot(null);
        }
        return [] as WalletAssetLike[];
      }
    },
    [connected, wallet],
  );

  const refreshUserState = useCallback(
    async (alias: string, options?: { signal?: AbortSignal; silent?: boolean }) => {
      const signal = options?.signal;
      const silent = options?.silent ?? false;

      if (!alias) {
        throw new Error("Token alias is empty.");
      }

      if (!silent) {
        setStateLoading(true);
        setStateError(null);
      }

      try {
        const response = await fetch(`${andamioStateApiBase}/${encodeURIComponent(alias)}/state`, {
          cache: "no-store",
          signal,
        });

        if (!response.ok) {
          let message = `Could not load user state (${response.status}).`;

          try {
            const errorPayload: unknown = await response.json();
            if (
              errorPayload &&
              typeof errorPayload === "object" &&
              "error" in errorPayload &&
              typeof errorPayload.error === "string"
            ) {
              message = errorPayload.error;
            }
          } catch {
            // Keep default message when response body is not JSON.
          }

          throw new Error(message);
        }

        const payload: unknown = await response.json();
        const normalizedState = normalizeUserState(payload, alias);
        setUserState(normalizedState);
        return normalizedState;
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }

        const message = error instanceof Error ? error.message : "Could not load user state.";
        const normalizedMessage =
          message === "Failed to fetch"
            ? "Could not reach onboarding state service. Check app connectivity and try again."
            : message;

        if (!silent) {
          setUserState(null);
          setStateError(normalizedMessage);
        }

        throw new Error(normalizedMessage);
      } finally {
        if (!silent && !signal?.aborted) {
          setStateLoading(false);
        }
      }
    },
    [],
  );

  const refreshCourseStatus = useCallback(
    async (
      alias: string,
      courseId: string,
      options?: { signal?: AbortSignal; silent?: boolean },
    ) => {
      const signal = options?.signal;
      const silent = options?.silent ?? false;

      if (!alias || !courseId) {
        throw new Error("Alias and course ID are required.");
      }

      if (!silent) {
        setCourseStatusLoading(true);
        setCourseStatusError(null);
      }

      try {
        const response = await fetch(
          `${andamioCourseStatusApiBase}/${encodeURIComponent(courseId)}/students/${encodeURIComponent(alias)}/status`,
          {
            cache: "no-store",
            signal,
          },
        );

        if (!response.ok) {
          let message = `Could not load assignment status (${response.status}).`;

          try {
            const errorPayload: unknown = await response.json();
            if (
              errorPayload &&
              typeof errorPayload === "object" &&
              "error" in errorPayload &&
              typeof errorPayload.error === "string"
            ) {
              message = errorPayload.error;
            }
          } catch {
            // Keep default message when response body is not JSON.
          }

          throw new Error(message);
        }

        const payload: unknown = await response.json();
        const normalizedStatus = normalizeCourseStudentStatus(payload, alias, courseId);
        setCourseStatus(normalizedStatus);
        return normalizedStatus;
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }

        const message = error instanceof Error ? error.message : "Could not load assignment status.";
        const normalizedMessage =
          message === "Failed to fetch"
            ? "Could not reach assignment status service. Check app connectivity and try again."
            : message;

        if (!silent) {
          setCourseStatus(null);
          setCourseStatusError(normalizedMessage);
        }

        throw new Error(normalizedMessage);
      } finally {
        if (!silent && !signal?.aborted) {
          setCourseStatusLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!connected) {
      setWalletAssetsSnapshot(null);
      return;
    }

    readWalletAssets({ updateState: true }).catch(() => undefined);
  }, [connected, readWalletAssets]);

  useEffect(() => {
    setAcceptedTerms(false);
    setIsTermsModalOpen(false);
    setTermsSubmitting(false);
    setTermsError(null);
    setTermsTxHash(null);
    setClaimSubmitting(false);
    setClaimError(null);
    setClaimTxHash(null);
    setTxConfirmation(null);
  }, [accessTokenName]);

  useEffect(() => {
    if (!isTermsModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsTermsModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTermsModalOpen]);

  useEffect(() => {
    if (!connected || !policyConfigured || !hasAccessToken || !accessTokenAlias) {
      setUserState(null);
      setStateLoading(false);
      setStateError(null);
      return;
    }

    const controller = new AbortController();
    const alias = accessTokenAlias;
    if (!alias) {
      setUserState(null);
      setStateLoading(false);
      setStateError("Token alias is empty.");
      return;
    }

    refreshUserState(alias, { signal: controller.signal }).catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [accessTokenAlias, connected, hasAccessToken, policyConfigured, refreshUserState]);

  useEffect(() => {
    if (!showStep2b || !accessTokenAlias || !andamioCourseId) {
      setCourseStatus(null);
      setCourseStatusLoading(false);
      setCourseStatusError(null);
      return;
    }

    const controller = new AbortController();

    refreshCourseStatus(accessTokenAlias, andamioCourseId, {
      signal: controller.signal,
    }).catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [accessTokenAlias, refreshCourseStatus, showStep2b]);

  const startTxConfirmation = useCallback((action: TxConfirmationAction, txHash: string) => {
    setTxConfirmation({
      action,
      txHash,
      startedAt: Date.now(),
      attempts: 0,
      phase: "confirming",
    });
  }, []);

  const retryTxConfirmation = useCallback(() => {
    setTxConfirmation((current) =>
      current
        ? {
          ...current,
          phase: "confirming",
          attempts: 0,
          startedAt: Date.now(),
        }
        : current,
    );
  }, []);

  const checkTxConfirmation = useCallback(
    async (action: TxConfirmationAction) => {
      if (action === "mint") {
        if (hasAccessToken) {
          return true;
        }

        if (!policyConfigured) {
          return false;
        }

        const walletAssets = await readWalletAssets({ updateState: true });
        return walletAssets.some(
          (asset) => asset.policyId === accessTokenPolicyId && hasPositiveQuantity(asset.quantity),
        );
      }

      if (!accessTokenAlias) {
        return false;
      }

      if (action === "terms") {
        if (!andamioCourseId) {
          return false;
        }

        const latestState = await refreshUserState(accessTokenAlias, { silent: true });
        const isEnrolled = latestState.enrolled_courses.includes(andamioCourseId);
        const hasAnyCourseRecord = latestState.completed_courses.some(
          (course) => course.course_id === andamioCourseId,
        );

        if (isEnrolled) {
          await refreshCourseStatus(accessTokenAlias, andamioCourseId, { silent: true }).catch(
            () => undefined,
          );
        }

        if (isEnrolled || hasAnyCourseRecord) {
          setAcceptedTerms(true);
          return true;
        }

        return false;
      }

      if (!step2ConfigReady) {
        return false;
      }

      const latestState = await refreshUserState(accessTokenAlias, { silent: true });
      const isCredentialClaimed = latestState.completed_courses.some(
        (course) =>
          course.course_id === andamioCourseId &&
          Array.isArray(course.claimed_credentials) &&
          course.claimed_credentials.includes(andamioSltHash),
      );

      if (isCredentialClaimed) {
        return true;
      }

      if (andamioCourseId) {
        await refreshCourseStatus(accessTokenAlias, andamioCourseId, { silent: true }).catch(
          () => undefined,
        );
      }

      return false;
    },
    [
      accessTokenAlias,
      hasAccessToken,
      policyConfigured,
      readWalletAssets,
      refreshCourseStatus,
      refreshUserState,
      step2ConfigReady,
    ],
  );

  useEffect(() => {
    if (hasAccessToken && txConfirmation?.action === "mint" && txConfirmation.phase === "confirming") {
      setTxConfirmation((current) =>
        current && current.action === "mint" && current.phase === "confirming"
          ? { ...current, phase: "confirmed" }
          : current,
      );
    }
  }, [hasAccessToken, txConfirmation]);

  useEffect(() => {
    if (!txConfirmation || txConfirmation.phase !== "confirming") {
      return;
    }

    if (Date.now() - txConfirmation.startedAt >= CONFIRMATION_TIMEOUT_MS) {
      setTxConfirmation((current) =>
        current && current.phase === "confirming" ? { ...current, phase: "timeout" } : current,
      );
      return;
    }

    const delay = CONFIRMATION_BACKOFF_MS[
      Math.min(txConfirmation.attempts, CONFIRMATION_BACKOFF_MS.length - 1)
    ];
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const confirmed = await checkTxConfirmation(txConfirmation.action);
        if (cancelled) {
          return;
        }

        if (confirmed) {
          setTxConfirmation((current) =>
            current && current.phase === "confirming" ? { ...current, phase: "confirmed" } : current,
          );
          return;
        }
      } catch {
        // Keep polling on transient errors until timeout.
      }

      if (!cancelled) {
        setTxConfirmation((current) =>
          current && current.phase === "confirming"
            ? { ...current, attempts: current.attempts + 1 }
            : current,
        );
      }
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [checkTxConfirmation, txConfirmation]);

  useEffect(() => {
    if (!txConfirmation || txConfirmation.phase !== "confirmed") {
      return;
    }

    const timer = window.setTimeout(() => {
      setTxConfirmation((current) =>
        current && current.phase === "confirmed" ? null : current,
      );
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [txConfirmation]);

  useEffect(() => {
    if (hasAccessToken) {
      setMintAlias("");
    }

    setMintSubmitting(false);
    setMintError(null);
    setMintTxHash(null);
  }, [connected, hasAccessToken]);

  async function handleMintAccessToken() {
    if (!connected) {
      setMintError("Connect wallet first.");
      return;
    }

    if (hasAccessToken) {
      setMintError("This wallet already has an Andamio access token.");
      return;
    }

    const alias = mintAlias.trim();
    if (!alias) {
      setMintError("Alias is required.");
      return;
    }

    setMintSubmitting(true);
    setMintError(null);
    setMintTxHash(null);

    try {
      const walletNetworkId = await wallet.getNetworkId();
      if (walletNetworkId !== 0) {
        throw new Error("Switch wallet network to Testnet/Preprod before minting.");
      }

      const initiatorAddress = await wallet.getChangeAddressBech32();
      const response = await fetch(andamioAccessTokenMintApi, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          alias,
          initiator_data: initiatorAddress,
        }),
      });

      if (!response.ok) {
        let message = `Could not create mint transaction (${response.status}).`;

        try {
          const errorPayload: unknown = await response.json();
          if (
            errorPayload &&
            typeof errorPayload === "object" &&
            "error" in errorPayload &&
            typeof errorPayload.error === "string"
          ) {
            message = errorPayload.error;
          }
        } catch {
          // Keep fallback error message when body is not JSON.
        }

        throw new Error(message);
      }

      const payload: unknown = await response.json();
      const unsignedTx =
        payload &&
          typeof payload === "object" &&
          "unsigned_tx" in payload &&
          typeof payload.unsigned_tx === "string"
          ? payload.unsigned_tx
          : "";

      if (!unsignedTx) {
        throw new Error("Mint API did not return unsigned_tx.");
      }

      const signedTx = await wallet.signTxReturnFullTx(unsignedTx, true);
      const txHash = await wallet.submitTx(signedTx);
      setMintTxHash(txHash);
      startTxConfirmation("mint", txHash);
    } catch (error) {
      const message = toErrorMessage(error);
      setMintError(
        message === "Failed to fetch"
          ? "Could not reach wallet provider or submitter. Check wallet connection and try again."
          : message,
      );
    } finally {
      setMintSubmitting(false);
    }
  }

  async function handleAcceptTerms() {
    if (!connected || !hasAccessToken || !accessTokenAlias) {
      setTermsError("Connect a wallet with a valid access token before accepting terms.");
      return;
    }

    setTermsSubmitting(true);
    setTermsError(null);

    try {
      const walletNetworkId = await wallet.getNetworkId();
      if (walletNetworkId !== 0) {
        throw new Error("Switch wallet network to Testnet/Preprod before accepting terms.");
      }

      const changeAddress = await wallet.getChangeAddressBech32();
      const walletUsedAddresses = await wallet.getUsedAddressesBech32();
      const usedAddresses = Array.from(new Set([changeAddress, ...walletUsedAddresses]));

      const response = await fetch(andamioTermsCommitApi, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          alias: accessTokenAlias,
          assignment_info: "I agree",
          course_id: andamioCourseId,
          initiator_data: {
            change_address: changeAddress,
            used_addresses: usedAddresses,
          },
          slt_hash: andamioSltHash,
        }),
      });

      if (!response.ok) {
        let message = `Could not create commit transaction (${response.status}).`;

        try {
          const errorPayload: unknown = await response.json();
          if (
            errorPayload &&
            typeof errorPayload === "object" &&
            "error" in errorPayload &&
            typeof errorPayload.error === "string"
          ) {
            message = errorPayload.error;
          }
        } catch {
          // Keep fallback error message when body is not JSON.
        }

        throw new Error(message);
      }

      const payload: unknown = await response.json();
      const unsignedTx =
        payload &&
          typeof payload === "object" &&
          "unsigned_tx" in payload &&
          typeof payload.unsigned_tx === "string"
          ? payload.unsigned_tx
          : "";

      if (!unsignedTx) {
        throw new Error("Commit API did not return unsigned_tx.");
      }

      const signedTx = await wallet.signTxReturnFullTx(unsignedTx, true);
      const txHash = await wallet.submitTx(signedTx);

      setTermsTxHash(txHash);
      setAcceptedTerms(false);
      setIsTermsModalOpen(false);
      startTxConfirmation("terms", txHash);
    } catch (error) {
      const message = toErrorMessage(error);
      setTermsError(
        message === "Failed to fetch"
          ? "Could not reach wallet provider or submitter. Check wallet connection and try again."
          : message,
      );
    } finally {
      setTermsSubmitting(false);
    }
  }

  async function handleClaimReceipt() {
    if (!connected || !hasAccessToken || !accessTokenAlias) {
      setClaimError("Connect a wallet with a valid access token before claiming the credential.");
      return;
    }

    if (!andamioCourseId) {
      setClaimError("Course ID is not configured.");
      return;
    }

    setClaimSubmitting(true);
    setClaimError(null);
    setClaimTxHash(null);

    try {
      const walletNetworkId = await wallet.getNetworkId();
      if (walletNetworkId !== 0) {
        throw new Error("Switch wallet network to Testnet/Preprod before claiming the credential.");
      }

      const changeAddress = await wallet.getChangeAddressBech32();
      const walletUsedAddresses = await wallet.getUsedAddressesBech32();
      const usedAddresses = Array.from(new Set([changeAddress, ...walletUsedAddresses]));

      const response = await fetch(andamioCredentialClaimApi, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          alias: accessTokenAlias,
          course_id: andamioCourseId,
          initiator_data: {
            change_address: changeAddress,
            used_addresses: usedAddresses,
          },
        }),
      });

      if (!response.ok) {
        let message = `Could not create claim transaction (${response.status}).`;

        try {
          const errorPayload: unknown = await response.json();
          if (
            errorPayload &&
            typeof errorPayload === "object" &&
            "error" in errorPayload &&
            typeof errorPayload.error === "string"
          ) {
            message = errorPayload.error;
          }
        } catch {
          // Keep fallback error message when body is not JSON.
        }

        throw new Error(message);
      }

      const payload: unknown = await response.json();
      const unsignedTx =
        payload &&
          typeof payload === "object" &&
          "unsigned_tx" in payload &&
          typeof payload.unsigned_tx === "string"
          ? payload.unsigned_tx
          : "";

      if (!unsignedTx) {
        throw new Error("Claim API did not return unsigned_tx.");
      }

      const signedTx = await wallet.signTxReturnFullTx(unsignedTx, true);
      const txHash = await wallet.submitTx(signedTx);
      setClaimTxHash(txHash);
      startTxConfirmation("claim", txHash);
    } catch (error) {
      const message = toErrorMessage(error);
      setClaimError(
        message === "Failed to fetch"
          ? "Could not reach wallet provider or submitter. Check wallet connection and try again."
          : message,
      );
    } finally {
      setClaimSubmitting(false);
    }
  }

  const totalSteps = 3;
  const completedSteps = Number(step1Complete) + Number(step2Complete) + Number(step3Complete);
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const walletStatusLabel = connecting ? "Connecting" : connected ? "Connected" : "Disconnected";
  const walletStatusTone = connected
    ? "bg-emerald-50 text-emerald-700"
    : connecting
      ? "bg-blue-50 text-blue-700"
      : "bg-slate-100 text-slate-600";
  const step2StatusLabel = step2Complete
    ? "Complete"
    : stateError || courseStatusError
      ? "Needs attention"
      : shouldShowPendingNotice
        ? "Pending review"
        : stateLoading || courseStatusLoading
          ? "Checking"
          : showStep2a
            ? "Action required"
            : showStep2b && shouldShowClaimReceipt
              ? "Ready"
              : "In progress";
  const step2StatusTone =
    step2StatusLabel === "Complete"
      ? "bg-emerald-50 text-emerald-700"
      : step2StatusLabel === "Pending review"
        ? "bg-amber-50 text-amber-700"
        : step2StatusLabel === "Needs attention"
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-700";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--andamio-surface)] text-[var(--andamio-text)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition duration-200"
        style={
          isTermsModalOpen
            ? {
              filter: "blur(10px) brightness(0.82)",
            }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-[linear-gradient(170deg,#ffffff_0%,#f7fafc_62%,#edf5fb_100%)]" />
        <div className="andamio-drift absolute -left-16 top-[8%] h-56 w-56 rounded-full bg-[var(--andamio-blue-soft)]" />
        <div className="andamio-float absolute -right-24 top-[14%] h-[280px] w-[280px] bg-[var(--andamio-orange)] [clip-path:polygon(20%_0%,100%_0%,100%_100%,0%_100%)] opacity-90" />
        <div className="andamio-pulse absolute right-[18%] top-[23%] h-8 w-8 rounded-full bg-[var(--andamio-orange-soft)]" />
        <div className="andamio-float-delay absolute left-[14%] bottom-[13%] h-10 w-10 rounded-full bg-[var(--andamio-blue-bright)]" />
      </div>

      <div
        className={`relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-8 pt-8 transition duration-200 sm:px-10 lg:px-12 lg:pt-10 ${isTermsModalOpen ? "pointer-events-none select-none" : ""}`}
        style={
          isTermsModalOpen
            ? {
              filter: "blur(8px) brightness(0.72)",
              transform: "scale(0.997)",
            }
            : undefined
        }
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-4">
            <div className="relative h-7 w-[132px]">
              <Image
                src="/andamio-logo-primary.svg"
                alt="Andamio"
                fill
                sizes="132px"
                unoptimized
                className="object-contain object-left"
              />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--andamio-orange)]">
                Easy onboarding
              </p>
              <h1 className="font-[family-name:var(--font-chivo)] text-3xl leading-tight text-slate-900 sm:text-4xl">
                Andamio onboarding dashboard
              </h1>
              <p className="max-w-2xl text-sm text-slate-600">
                Verify wallet access, complete the prerequisite review flow, and unlock the
                assigned Andamio project workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
              {completedSteps}/{totalSteps} complete
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${walletStatusTone}`}
            >
              {walletStatusLabel}
            </span>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-[rgba(0,78,137,0.18)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--andamio-blue)] transition hover:border-[var(--andamio-blue)] hover:text-[var(--andamio-blue-strong)]"
            >
              Back to landing
            </Link>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-6">
            <article className="rounded-3xl bg-white p-6 shadow-[0_10px_34px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Onboarding journey
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-chivo)] text-2xl text-slate-900 sm:text-[2rem]">
                    Step-by-step path
                  </h2>
                </div>
                <p className="text-sm text-slate-500">Progress {progressPercent}%</p>
              </div>

              <div className="my-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[var(--andamio-orange)] transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {txConfirmation ? (
                <div
                  className={`mt-4 rounded-xl border px-3 py-3 text-sm ${txConfirmation.phase === "confirmed"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : txConfirmation.phase === "timeout"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-blue-200 bg-blue-50 text-blue-900"
                    }`}
                >
                  <p className="font-semibold">
                    {txActionLabel}{" "}
                    {txConfirmation.phase === "confirmed"
                      ? "confirmed"
                      : txConfirmation.phase === "timeout"
                        ? "still pending"
                        : "submitted"}
                    .
                  </p>
                  <p className="mt-1 text-xs">
                    Tx: <span className="font-mono">{txConfirmation.txHash}</span>
                  </p>
                  {txConfirmation.phase === "confirming" ? (
                    <p className="mt-1 text-xs">
                      Waiting for chain confirmation and state sync. Checking automatically...
                    </p>
                  ) : null}
                  {txConfirmation.phase === "timeout" ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="text-xs">Confirmation is taking longer than expected.</p>
                      <button
                        type="button"
                        onClick={retryTxConfirmation}
                        className="cta-secondary !min-h-8 !px-2.5 !py-1.5 !text-xs"
                      >
                        Refresh status
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <ol className="relative mt-8 space-y-8 before:absolute before:bottom-0 before:left-[17px] before:top-4 before:w-px before:bg-slate-200">
                <li className="relative pl-14">
                  <div
                    className={`absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${step1Complete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[var(--andamio-blue-soft)] text-[var(--andamio-blue)]"
                      }`}
                  >
                    1
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">Access token</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${step1Complete
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                        }`}
                    >
                      {step1Complete ? "Complete" : "In progress"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Confirm wallet identity using an Andamio access token.
                  </p>

                  {!step1Complete ? (
                    <div className="mt-4 rounded-2xl bg-slate-50/90 p-4 pb-6 ring-1 ring-slate-200/70 sm:p-5 sm:pb-7">
                      {!connected ? (
                        <p className="text-sm text-slate-700">
                          Connect your wallet from the context panel to begin.
                        </p>
                      ) : null}

                      {connected && !policyConfigured ? (
                        <p className="text-sm text-rose-700">
                          Access token policy is not configured. Set
                          <code className="mx-1 rounded bg-rose-100 px-1 py-0.5 text-[11px] text-rose-800">
                            NEXT_PUBLIC_ANDAMIO_ACCESS_TOKEN_POLICY_ID
                          </code>
                          in your environment.
                        </p>
                      ) : null}

                      {connected && policyConfigured && !step1Complete ? (
                        <>
                          <p className="text-sm text-slate-700">
                            No access token detected. Create one to continue.
                          </p>
                          <label
                            htmlFor="mint-alias"
                            className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                          >
                            New alias
                          </label>
                          <input
                            id="mint-alias"
                            type="text"
                            value={mintAlias}
                            onChange={(event) => setMintAlias(event.target.value)}
                            placeholder="unique_alias"
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-[var(--andamio-orange)]/30 placeholder:text-slate-400 focus:ring-2"
                          />
                          <button
                            type="button"
                            disabled={mintSubmitting || isMintConfirming || mintAlias.trim().length === 0}
                            onClick={handleMintAccessToken}
                            className="cta-primary w-full sm:w-auto"
                            style={{ marginTop: "1rem" }}
                          >
                            {mintSubmitting
                              ? "Minting..."
                              : isMintConfirming
                                ? "Awaiting confirmation..."
                                : "Get access token"}
                          </button>
                          {mintTxHash ? (
                            <p className="mt-2 break-all text-xs text-emerald-700">
                              Mint submitted: <span className="font-mono">{mintTxHash}</span>
                            </p>
                          ) : null}
                          {isMintConfirming ? (
                            <p className="text-xs text-blue-700">
                              Waiting for token confirmation. Step 1 will complete automatically.
                            </p>
                          ) : null}
                          {mintError ? <p className="mt-2 text-xs text-rose-700">{mintError}</p> : null}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </li>

                <li className="relative pl-14">
                  <div
                    className={`absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${step2Complete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[var(--andamio-blue-soft)] text-[var(--andamio-blue)]"
                      }`}
                  >
                    2
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">Prerequisite verification</h3>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${step2StatusTone}`}
                    >
                      {shouldShowPendingNotice ? (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                      ) : null}
                      {step2StatusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Submit the prerequisite acknowledgement and wait for administrator verification.
                  </p>

                  {!step2Complete ? (
                    <div className="mt-4 rounded-2xl bg-slate-50/90 p-4 pb-6 ring-1 ring-slate-200/70 sm:p-5 sm:pb-7">
                      {!connected ? (
                        <p className="text-sm text-slate-700">
                          Connect your wallet and finish Step 1 before this step can be evaluated.
                        </p>
                      ) : null}

                      {connected && !step2ConfigReady ? (
                        <p className="text-sm text-rose-700">
                          Configure
                          <code className="mx-1 rounded bg-rose-100 px-1 py-0.5 text-[11px] text-rose-800">
                            NEXT_PUBLIC_ANDAMIO_COURSE_ID
                          </code>
                          and
                          <code className="mx-1 rounded bg-rose-100 px-1 py-0.5 text-[11px] text-rose-800">
                            NEXT_PUBLIC_ANDAMIO_SLT_HASH
                          </code>
                          to evaluate this step.
                        </p>
                      ) : null}

                      {connected && step2ConfigReady && !step1Complete ? (
                        <p className="text-sm text-slate-700">Finish Step 1 first to unlock Step 2.</p>
                      ) : null}

                      {connected && step2ConfigReady && step1Complete && stateLoading ? (
                        <p className="text-sm text-slate-700">Checking enrollment and completion state...</p>
                      ) : null}
                      {connected && step2ConfigReady && step1Complete && stateError ? (
                        <p className="text-sm text-rose-700">{stateError}</p>
                      ) : null}

                      {connected && step2ConfigReady && step1Complete && !stateLoading && !stateError && showStep2a ? (
                        <div className="space-y-3">
                          <p className="text-sm text-slate-700">
                            You are not enrolled yet. Accept terms to submit your prerequisite.
                          </p>
                          {shouldShowAcceptTerms ? (
                            <button
                              type="button"
                              disabled={isTermsConfirming}
                              onClick={() => {
                                setTermsError(null);
                                setIsTermsModalOpen(true);
                              }}
                              className="cta-primary w-full sm:w-auto"
                              style={{ marginTop: "1rem" }}
                            >
                              {isTermsConfirming
                                ? "Awaiting confirmation..."
                                : "Accept terms and conditions"}
                            </button>
                          ) : null}
                          {acceptedTerms ? (
                            <p className="text-xs font-medium text-emerald-700">Terms accepted.</p>
                          ) : null}
                          {termsTxHash ? (
                            <p className="break-all text-xs text-emerald-700">
                              Submitted tx: <span className="font-mono">{termsTxHash}</span>
                            </p>
                          ) : null}
                          {isTermsConfirming ? (
                            <p className="text-xs text-blue-700">
                              Waiting for confirmation. Step 2 will update automatically.
                            </p>
                          ) : null}
                          {termsError ? <p className="text-xs text-rose-700">{termsError}</p> : null}
                        </div>
                      ) : null}

                      {connected && step2ConfigReady && step1Complete && !stateLoading && !stateError && showStep2b ? (
                        <div className="space-y-2">
                          <p className="text-sm text-slate-700">
                            Enrollment detected. Checking assignment status.
                          </p>
                          {courseStatusLoading ? (
                            <p className="text-sm text-slate-600">Loading assignment status...</p>
                          ) : null}
                          {!courseStatusLoading && courseStatusError ? (
                            <p className="text-sm text-rose-700">{courseStatusError}</p>
                          ) : null}
                          {!courseStatusLoading && !courseStatusError && shouldShowPendingNotice ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-3">
                              <div className="flex items-start gap-2.5">
                                <span
                                  aria-hidden
                                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
                                >
                                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                                    <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.7" />
                                    <path
                                      d="M10 5.8V10.1L12.9 11.8"
                                      stroke="currentColor"
                                      strokeWidth="1.7"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-amber-900">
                                    Pending administrator review
                                  </p>
                                  <p className="mt-1 text-sm text-amber-900/90">
                                    Wait for program administrators to verify you. No action is
                                    required right now.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {!courseStatusLoading && !courseStatusError && shouldShowClaimReceipt ? (
                            <div style={{ marginTop: "1rem" }}>
                              <p className="text-sm text-slate-700">
                                Assignment status is {claimableAssignmentStatus || "Accepted"}.
                                You can now claim the completion credential and move to the final
                                access step.
                              </p>
                              <button
                                type="button"
                                disabled={claimSubmitting || isClaimConfirming}
                                onClick={handleClaimReceipt}
                                className="cta-primary w-full sm:w-auto"
                                style={{ marginTop: "1.25rem" }}
                              >
                                {claimSubmitting
                                  ? "Claiming..."
                                  : isClaimConfirming
                                    ? "Awaiting confirmation..."
                                    : "Claim"}
                              </button>
                              {claimTxHash ? (
                                <p className="break-all text-xs text-emerald-700" style={{ marginTop: "0.75rem" }}>
                                  Claim submitted: <span className="font-mono">{claimTxHash}</span>
                                </p>
                              ) : null}
                              {isClaimConfirming ? (
                                <p className="text-xs text-blue-700" style={{ marginTop: "0.5rem" }}>
                                  Waiting for claim confirmation. Completion will be detected
                                  automatically.
                                </p>
                              ) : null}
                              {claimError ? <p className="text-xs text-rose-700">{claimError}</p> : null}
                            </div>
                          ) : null}
                          {!courseStatusLoading &&
                            !courseStatusError &&
                            !shouldShowPendingNotice &&
                            !shouldShowClaimReceipt ? (
                            <p className="text-sm text-slate-700">
                              Status: {currentAssignmentRawStatus || "Not available yet"}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {connected &&
                        step2ConfigReady &&
                        step1Complete &&
                        !stateLoading &&
                        !stateError &&
                        !step2Complete &&
                        !showStep2a &&
                        !showStep2b ? (
                        <p className="text-sm text-slate-700">
                          Step in progress. Waiting for enrollment or matching completion credential.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>

                <li className="relative pl-14">
                  <div
                    className={`absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${step3Complete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[var(--andamio-blue-soft)] text-[var(--andamio-blue)]"
                      }`}
                  >
                    3
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">Project access</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${step3Complete ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                        }`}
                    >
                      {step3Complete ? "Complete" : "In progress"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Final step. Open the assigned project workspace once onboarding is complete.
                  </p>

                  <div className="mt-4 rounded-2xl bg-slate-50/90 p-4 pb-6 ring-1 ring-slate-200/70 sm:p-5 sm:pb-7">
                    {!step2Complete ? (
                      <p className="text-sm text-slate-700">
                        Complete Step 2 to finish onboarding and unlock project access.
                      </p>
                    ) : null}

                    {step2Complete && !hasProjectId ? (
                      <p className="text-sm text-rose-700">
                        Project ID is not configured. Set
                        <code className="mx-1 rounded bg-rose-100 px-1 py-0.5 text-[11px] text-rose-800">
                          NEXT_PUBLIC_ANDAMIO_PROJECT_ID
                        </code>
                        in your environment.
                      </p>
                    ) : null}

                    {step3Complete ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-emerald-700">
                          You are onboarded. You can now proceed to the project workspace.
                        </p>
                        <a
                          href={projectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="cta-primary w-full sm:w-auto"
                          style={{ marginTop: "1rem" }}
                        >
                          Open project workspace
                        </a>
                      </div>
                    ) : null}
                  </div>
                </li>
              </ol>
            </article>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <article className="rounded-2xl bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                Wallet context
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Used for signing and submitting transaction steps.
              </p>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <CardanoWallet
                  label={connecting ? "Connecting..." : "Connect wallet"}
                  persist
                  showDownload
                />
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium text-slate-900">{walletStatusLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Network</dt>
                  <dd className="font-medium text-slate-900">{networkLabel(networkId)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Alias</dt>
                  <dd className="max-w-[160px] truncate font-medium text-slate-900">
                    {accessTokenAlias || "Not available"}
                  </dd>
                </div>
                <div className="space-y-1 border-t border-slate-200 pt-3">
                  <dt className="text-slate-500">Address</dt>
                  <dd className="break-all font-mono text-xs text-slate-700">
                    {address ? shortenAddress(address) : "Awaiting wallet connection"}
                  </dd>
                </div>
              </dl>
            </article>

            <details className="group rounded-2xl bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70">
              <summary className="list-none cursor-pointer text-sm font-semibold text-slate-800">
                Technical details
              </summary>
              <div className="mt-4 space-y-3 text-xs text-slate-600">
                <div>
                  <p className="font-semibold uppercase tracking-[0.1em] text-slate-500">Policy ID</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-700">
                    {policyConfigured ? accessTokenPolicyId : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-[0.1em] text-slate-500">Course ID</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-700">
                    {andamioCourseId || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-[0.1em] text-slate-500">SLT hash</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-700">
                    {andamioSltHash || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-[0.1em] text-slate-500">Project ID</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-700">
                    {andamioProjectId || "Not set"}
                  </p>
                </div>
              </div>
            </details>
          </aside>
        </div>

      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-4">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-[0_6px_22px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <span>Powered by</span>
          <span className="relative block h-4 w-[72px] shrink-0 overflow-hidden">
            <Image
              src="/andamio-logo-primary.svg"
              alt="Andamio"
              fill
              sizes="72px"
              unoptimized
              className="object-contain object-left"
            />
          </span>
        </div>
      </footer>

      {isTermsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close terms modal"
            className="absolute inset-0"
            style={{
              backgroundColor: "rgba(2, 6, 23, 0.56)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
            onClick={() => setIsTermsModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-modal-title"
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.3)] ring-1 ring-slate-200"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--andamio-orange)]">
              Prerequisite review
            </p>
            <h3
              id="terms-modal-title"
              className="mt-2 font-[family-name:var(--font-chivo)] text-2xl text-slate-900"
            >
              Accept terms and conditions
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              By continuing, you confirm that you reviewed the onboarding prerequisites and agree
              to follow the submission, evidence, and approval requirements for this program.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={termsSubmitting}
                onClick={() => setIsTermsModalOpen(false)}
                className="cta-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={termsSubmitting}
                onClick={handleAcceptTerms}
                className="cta-primary"
              >
                {termsSubmitting ? "Submitting..." : "I accept"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
