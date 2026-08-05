import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Info, LayoutGrid } from "lucide-react";
import type { CarryoutOrder } from "../TourBarOrdering";
import SmartBarMobileShell, {
  type SmartBarMobileApplyChoiceMeta,
  type SmartBarMobileOrderLine,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
} from "../smartbar-mobile/SmartBarMobileShell";
import { normalizeSmartBarVendorContext, type SmartBarVendorContext } from "../smartbar-mobile/SmartBarVendorContext";
import {
  smartBarMobileApplyChoiceToCarryoutOrder,
  smartBarMobileApplyChoiceToVisibleLines,
  smartBarMobileEstimatedTotalFromLines,
  smartBarMobileFilterReplacementLine,
  smartBarMobileMergeCarryoutOrders,
  smartBarMobileMergeOrderResults,
  smartBarMobileQueryShouldUseExistingCart,
  smartBarMobileRemoveLineFromCarryoutOrder,
  smartBarMobileRemoveReplacementFromCarryoutOrder,
  smartBarMobileRemoveVisibleLine,
} from "../smartbar-mobile/burgerrush/burgerRushMobileCartReducer";
import { smartBarMobileTicketSelectionDetails } from "../smartbar-mobile/smartBarMobileSelectionDetails";
import {
  smartBarMobileAttachUnknownNoteToLineInLines,
  smartBarMobilePreserveAttachedCustomerNotes,
  smartBarMobileSaveUnknownAsNoteInLines,
} from "../smartbar-mobile/smartBarMobileCustomerNotes";
import {
  smartBarPlaygroundApplyPricingOnly,
  smartBarPlaygroundShouldRequestChoiceRefresh,
} from "./smartBarPlaygroundChoiceIsolation";
import { smartBarPlaygroundApplyGrayAiTraces } from "./smartBarGrayAiTrace";
import {
  smartBarMobileApiErrorResult,
  smartBarMobileRepriceCartFromGuideAi,
  smartBarMobileResultFromGuideAi,
} from "../smartbar-mobile/burgerrush/burgerRushMobileGuideAdapter";
import SmartBarOrderBoardMock, { SmartBarOrderSheet, type SmartBarOrderBoardItem } from "../order-board/SmartBarOrderBoardMock";

const SMARTBAR_TICKET_CREATE_URL = "/api/smartbar-tickets/create";
const SMARTBAR_TICKET_LIST_URL = "/api/smartbar-tickets/list";
const SMARTBAR_TICKET_SCORE_URL = "/api/smartbar-tickets/score";
const SMARTBAR_PLAYGROUND_BOARD_REFRESH_DELAY_MS = 650;

function smartBarPlaygroundCoverageSections(value: string) {
  return String(value || "")
    .split("|")
    .map((section) => section.trim())
    .filter(Boolean);
}

type SmartBarTicketCreateResponse = {
  ok?: boolean;
  ticketId?: string;
  ticketNumber?: string;
  ticketDisplayId?: string;
  mode?: string;
  businessDate?: string;
  readinessStatus?: string;
  readinessNote?: string;
  managerScoreStatus?: string;
  managerScoreNote?: string;
  managerScoredAt?: string;
  scoringStatus?: string;
  scoreNote?: string;
  readyLineCount?: number | string;
  requiredLineCount?: number | string;
  optionalLineCount?: number | string;
  unknownLineCount?: number | string;
  issueLineCount?: number | string;
  code?: string;
  message?: string;
};

type SmartBarPlaygroundTicketReadiness = {
  readinessStatus: "ready" | "needs_review";
  readinessNote: string;
  readyLineCount: number;
  requiredLineCount: number;
  optionalLineCount: number;
  unknownLineCount: number;
  issueLineCount: number;
};

type PersistedSmartBarTicketLine = {
  title?: string;
  name?: string;
  quantity?: number | string;
  status?: string;
  details?: unknown;
  price?: string;
  kind?: string;
  originalRequest?: string;
  customerNote?: string;
};

type PersistedSmartBarTicket = {
  ticketId?: string;
  ticketNumber?: string;
  ticketDisplayId?: string;
  clientId?: string;
  vendorId?: string;
  displayName?: string;
  menuProfileId?: string;
  behaviorProfileId?: string;
  boardProfileId?: string;
  timezone?: string;
  mode?: string;
  businessDate?: string;
  status?: string;
  readinessStatus?: "ready" | "needs_review" | string;
  readinessNote?: string;
  managerScoreStatus?: "unscored" | "ready" | "needs_fix" | string;
  managerScoreNote?: string;
  managerScoredAt?: string;
  scoringStatus?: "unscored" | "ready" | "needs_fix" | string;
  scoreNote?: string;
  readyLineCount?: number | string;
  requiredLineCount?: number | string;
  optionalLineCount?: number | string;
  unknownLineCount?: number | string;
  issueLineCount?: number | string;
  customerText?: string;
  itemCount?: number | string;
  pricingMode?: "restaurant-calculated" | "exact" | string;
  estimatedTotal?: number | string;
  createdAt?: string;
  ticket?: {
    pricingMode?: "restaurant-calculated" | "exact" | string;
    items?: PersistedSmartBarTicketLine[];
    totals?: {
      pricingMode?: "restaurant-calculated" | "exact" | string;
      estimatedTotal?: number | string;
      estimatedTotalLabel?: string;
      paymentMessage?: string;
    };
  };
};

type SmartBarTicketListResponse = {
  ok?: boolean;
  tickets?: PersistedSmartBarTicket[];
  code?: string;
  message?: string;
};

type SmartBarTicketManagerScore = "ready" | "needs_fix";

type SmartBarTicketScoreResponse = PersistedSmartBarTicket & {
  ok?: boolean;
  code?: string;
  message?: string;
};

function smartBarManagerScoreFromValue(value: unknown): SmartBarTicketManagerScore | undefined {
  return value === "ready" || value === "needs_fix" ? value : undefined;
}

function smartBarPlaygroundNumberFromCurrency(value: string | undefined) {
  const normalized = String(value || "").replace(/[^0-9.-]/g, "");
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function smartBarPlaygroundPlural(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function smartBarPlaygroundMenuItemCount(lines: SmartBarMobileOrderLine[]) {
  const menuItemCount = lines.filter((line) => !line.isCustomerNote).length;
  return Math.max(1, menuItemCount || lines.length || 1);
}

function smartBarPlaygroundBuildReadiness(lines: SmartBarMobileOrderLine[]): SmartBarPlaygroundTicketReadiness {
  let readyLineCount = 0;
  let requiredLineCount = 0;
  let optionalLineCount = 0;
  let unknownLineCount = 0;
  let otherIssueLineCount = 0;

  lines.forEach((line) => {
    if (line.status === "ready") {
      readyLineCount += 1;
      return;
    }

    if (line.status === "pending") {
      requiredLineCount += 1;
      return;
    }

    if (line.status === "options") {
      readyLineCount += 1;
      optionalLineCount += 1;
      return;
    }

    if (line.status === "unknown") {
      unknownLineCount += 1;
      return;
    }

    otherIssueLineCount += 1;
  });

  const issueLineCount = requiredLineCount + unknownLineCount + otherIssueLineCount;

  if (!issueLineCount) {
    return {
      readinessStatus: "ready",
      readinessNote: optionalLineCount
        ? `Ready. ${smartBarPlaygroundPlural(optionalLineCount, "item has", "items have")} optional choices available.`
        : "All lines ready.",
      readyLineCount,
      requiredLineCount,
      optionalLineCount,
      unknownLineCount,
      issueLineCount,
    };
  }

  const parts = [
    requiredLineCount ? smartBarPlaygroundPlural(requiredLineCount, "required choice") : "",
    unknownLineCount ? smartBarPlaygroundPlural(unknownLineCount, "unknown item") : "",
    otherIssueLineCount ? smartBarPlaygroundPlural(otherIssueLineCount, "other issue") : "",
  ].filter(Boolean);

  return {
    readinessStatus: "needs_review",
    readinessNote: `Needs attention: ${parts.join(", ")}.`,
    readyLineCount,
    requiredLineCount,
    optionalLineCount,
    unknownLineCount,
    issueLineCount,
  };
}

async function createPersistentSmartBarTicket(
  result: SmartBarMobileOrderResult,
  rawOrder: string,
  vendorContext: SmartBarVendorContext,
): Promise<SmartBarTicketCreateResponse | null> {
  const lines = result.lines || [];
  const readiness = smartBarPlaygroundBuildReadiness(lines);
  const pricingMode = result.pricingMode === "restaurant-calculated" ? "restaurant-calculated" : "exact";
  const restaurantCalculatedPricing = pricingMode === "restaurant-calculated";

  const payload = {
    clientId: vendorContext.clientId,
    vendorId: vendorContext.vendorId,
    menuProfileId: vendorContext.menuProfileId,
    behaviorProfileId: vendorContext.behaviorProfileId,
    boardProfileId: vendorContext.boardProfileId,
    timezone: vendorContext.timezone,
    mode: "sandbox",
    customerText: rawOrder || "SmartBar order",
    itemCount: smartBarPlaygroundMenuItemCount(lines),
    readinessStatus: readiness.readinessStatus,
    readinessNote: readiness.readinessNote,
    managerScoreStatus: "unscored",
    managerScoreNote: "",
    readyLineCount: readiness.readyLineCount,
    requiredLineCount: readiness.requiredLineCount,
    optionalLineCount: readiness.optionalLineCount,
    unknownLineCount: readiness.unknownLineCount,
    issueLineCount: readiness.issueLineCount,
    pricingMode,
    ticket: {
      pricingMode,
      items: lines.map((line) => ({
        title: line.isCustomerNote ? "Customer note" : line.demoDisplayTitle || line.title,
        quantity: 1,
        status: line.status,
        details: boardDetailsForLine(line) || [],
        ...(!restaurantCalculatedPricing && line.price ? { price: line.price } : {}),
        kind: line.isCustomerNote ? "customer_note" : "menu_item",
        originalRequest: line.originalUnknownText || "",
        customerNote: line.customerNote || "",
      })),
      totals: restaurantCalculatedPricing
        ? {
            pricingMode,
            paymentMessage: "Total calculated by restaurant. Pay at pickup.",
          }
        : {
            pricingMode,
            estimatedTotal: smartBarPlaygroundNumberFromCurrency(result.estimatedTotal),
            estimatedTotalLabel: result.estimatedTotal || "",
          },
    },
  };

  const response = await fetch(SMARTBAR_TICKET_CREATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as SmartBarTicketCreateResponse | null;

  if (!response.ok || !json?.ok) {
    throw new Error(json?.message || json?.code || `SmartBar ticket create failed with HTTP ${response.status}`);
  }

  return json;
}

function smartBarTicketListUrl(vendorContext: SmartBarVendorContext) {
  const params = new URLSearchParams({
    vendorId: vendorContext.vendorId,
    mode: "sandbox",
    timezone: vendorContext.timezone,
  });

  return `${SMARTBAR_TICKET_LIST_URL}?${params.toString()}`;
}

async function listPersistentSmartBarTickets(vendorContext: SmartBarVendorContext): Promise<PersistedSmartBarTicket[]> {
  const response = await fetch(smartBarTicketListUrl(vendorContext), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const json = (await response.json().catch(() => null)) as SmartBarTicketListResponse | null;

  if (!response.ok || !json?.ok) {
    throw new Error(json?.message || json?.code || `SmartBar ticket list failed with HTTP ${response.status}`);
  }

  return Array.isArray(json.tickets) ? json.tickets : [];
}

async function updatePersistentSmartBarTicketScore(
  order: SmartBarOrderBoardItem,
  score: SmartBarTicketManagerScore,
  note: string,
  vendorContext: SmartBarVendorContext,
): Promise<SmartBarTicketScoreResponse | null> {
  if (!order.backendTicketId) return null;

  const payload = {
    ticketId: order.backendTicketId,
    vendorId: order.vendorId || vendorContext.vendorId,
    mode: "sandbox",
    businessDate: order.businessDate,
    timezone: order.timezone || vendorContext.timezone,
    managerScoreStatus: score,
    managerScoreNote: score === "needs_fix" ? note : "",
  };

  const response = await fetch(SMARTBAR_TICKET_SCORE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as SmartBarTicketScoreResponse | null;

  if (!response.ok || !json?.ok) {
    throw new Error(json?.message || json?.code || `SmartBar ticket score failed with HTTP ${response.status}`);
  }

  return json;
}

type SmartBarPlaygroundProps = {
  onBack: () => void;
  onMainMenu: () => void;
  onRequestSetup: () => Promise<void>;
  vendorContext?: SmartBarVendorContext | null;
};

function smartBarPlaygroundRetryKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/^\s*\d+\s*x\s*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function smartBarPlaygroundRetryLineInstanceKey(line: SmartBarMobileOrderLine) {
  return String(line.cartLineKey || line.id || line.sourceLineItemId || line.title || "").trim();
}

function smartBarPlaygroundRetryLinesAreSameInstance(left: SmartBarMobileOrderLine, right: SmartBarMobileOrderLine) {
  const leftKey = smartBarPlaygroundRetryLineInstanceKey(left);
  const rightKey = smartBarPlaygroundRetryLineInstanceKey(right);

  if (leftKey && rightKey) return leftKey === rightKey;

  if (left.sourceLineIndex !== undefined && right.sourceLineIndex !== undefined) {
    return left.sourceLineIndex === right.sourceLineIndex;
  }

  return Boolean(left.id && right.id && left.id === right.id);
}

function smartBarPlaygroundRetryFallbackLine(query: string, meta?: SmartBarMobileSubmitMeta): SmartBarMobileOrderLine {
  const title = query.trim() || meta?.replaceLineTitle || "Requested item";
  const key = smartBarPlaygroundRetryKey(title) || smartBarPlaygroundRetryKey(meta?.replaceLineId || "") || "item";

  return {
    id: meta?.replaceLineId || `retry-unmatched-${key}`,
    cartLineKey: meta?.replaceLineId || `retry-unmatched-${key}`,
    sourceLineItemId: meta?.replaceSourceLineItemId,
    sourceLineIndex: meta?.replaceSourceLineIndex,
    sourceBucket: meta?.replaceSourceBucket,
    title,
    status: "unknown",
    helper: "Not on this menu",
    price: "-",
    details: [],
    retryPrompt: "Try again using an item name from this menu.",
  };
}

function smartBarPlaygroundEnsureRetryReplacementLine(
  lines: SmartBarMobileOrderLine[],
  previousLines: SmartBarMobileOrderLine[],
  query: string,
  meta?: SmartBarMobileSubmitMeta,
) {
  if (meta?.intent !== "replace_unknown") return lines;

  const hasReplacementCandidate = lines.some((line) => (
    !previousLines.some((previousLine) => smartBarPlaygroundRetryLinesAreSameInstance(previousLine, line))
  ));

  if (hasReplacementCandidate) return lines;

  return [...lines, smartBarPlaygroundRetryFallbackLine(query, meta)];
}

function formatPlaygroundTicketId(sequence: number) {
  return `T-${String(sequence).padStart(3, "0")}`;
}

function boardDetailsForLine(line: SmartBarMobileOrderLine) {
  if (line.bundleComponents?.length) {
    return line.bundleComponents.map((component) => {
      const title = String(component.demoDisplayTitle || component.title || component.bundleSlotId || "Included item").trim();
      const selections = smartBarMobileTicketSelectionDetails(component);
      return selections.length ? `${title}: ${selections.join(", ")}` : title;
    });
  }

  const selections = smartBarMobileTicketSelectionDetails(line);
  if (selections.length) return selections;
  if ((line.status === "pending" || line.status === "unknown") && line.helper) return [line.helper];
  return undefined;
}

function smartBarTicketDisplayId(ticket: PersistedSmartBarTicket) {
  if (ticket.ticketDisplayId) return ticket.ticketDisplayId;
  if (ticket.ticketNumber) {
    return ticket.ticketNumber.startsWith("#") ? ticket.ticketNumber : `#${ticket.ticketNumber}`;
  }

  return ticket.ticketId || "SmartBar ticket";
}

function smartBarTicketDetails(value: unknown) {
  if (Array.isArray(value)) return value.map((detail) => String(detail || "").trim()).filter(Boolean);
  const detail = String(value || "").trim();
  return detail ? [detail] : undefined;
}

function smartBarTicketQuantity(value: number | string | undefined) {
  const parsed = Number(value || 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}


function smartBarTicketTotalLabel(value: number | string | undefined) {
  const total = String(value || "").trim();
  if (!total) return "";
  return total.startsWith("$") ? total : `$${total}`;
}

function smartBarTicketMinutesAgo(createdAt?: string) {
  const timestamp = Date.parse(String(createdAt || ""));
  if (!Number.isFinite(timestamp)) return 0;

  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

function smartBarPersistedTicketToBoardOrder(
  ticket: PersistedSmartBarTicket,
  vendorContext: SmartBarVendorContext,
): SmartBarOrderBoardItem {
  const items = ticket.ticket?.items || [];
  const ticketId = smartBarTicketDisplayId(ticket);
  const pricingMode = String(ticket.pricingMode || ticket.ticket?.pricingMode || ticket.ticket?.totals?.pricingMode || "exact");
  const estimatedTotalLabel = pricingMode === "restaurant-calculated"
    ? ""
    : ticket.ticket?.totals?.estimatedTotalLabel || smartBarTicketTotalLabel(ticket.estimatedTotal);

  return {
    id: ticketId,
    minutesAgo: smartBarTicketMinutesAgo(ticket.createdAt),
    status: ticket.status === "processed" || ticket.status === "entered" ? "entered" : "new",
    customer: "SmartBar",
    phone: "202-555-0184",
    pickup: "ASAP",
    itemCount: Math.max(1, Number(ticket.itemCount || items.length || 1) || 1),
    groups: [
      {
        title: "Order",
        items: items.length
          ? items.map((item) => ({
              quantity: smartBarTicketQuantity(item.quantity),
              name: item.kind === "customer_note" ? "Customer note" : item.title || item.name || "SmartBar ticket",
              details: smartBarTicketDetails(item.details),
            }))
          : [{ quantity: 1, name: "SmartBar ticket" }],
      },
    ],
    notes: [
      ticket.customerText ? `Heard: ${ticket.customerText}` : "SmartBar ticket",
      estimatedTotalLabel ? `Total: ${estimatedTotalLabel}` : "",
    ]
      .filter(Boolean)
      .join(" - "),
    score: smartBarManagerScoreFromValue(ticket.managerScoreStatus),
    scoreNote: ticket.managerScoreNote || "",
    backendTicketId: ticket.ticketId,
    businessDate: ticket.businessDate,
    mode: ticket.mode || "sandbox",
    readinessStatus: ticket.readinessStatus || (ticket.scoringStatus === "ready" ? "ready" : ticket.scoringStatus === "needs_fix" ? "needs_review" : undefined),
    readinessNote: ticket.readinessNote || "",
    clientId: ticket.clientId || vendorContext.clientId,
    vendorId: ticket.vendorId || vendorContext.vendorId,
    displayName: ticket.displayName || vendorContext.displayName,
    menuProfileId: ticket.menuProfileId || vendorContext.menuProfileId,
    behaviorProfileId: ticket.behaviorProfileId || vendorContext.behaviorProfileId,
    boardProfileId: ticket.boardProfileId || vendorContext.boardProfileId,
    timezone: ticket.timezone || vendorContext.timezone,
  };
}

function createBoardOrderFromResult(
  result: SmartBarMobileOrderResult,
  rawOrder: string,
  ticketId: string,
  vendorContext: SmartBarVendorContext,
): SmartBarOrderBoardItem {
  const lines = result.lines || [];
  const readiness = smartBarPlaygroundBuildReadiness(lines);

  return {
    id: ticketId,
    minutesAgo: 0,
    status: "new",
    customer: "SmartBar",
    phone: "202-555-0184",
    pickup: "ASAP",
    itemCount: smartBarPlaygroundMenuItemCount(lines),
    groups: [
      {
        title: "Order",
        items: lines.length
          ? lines.map((line) => ({
              quantity: 1,
              name: line.isCustomerNote ? "Customer note" : line.demoDisplayTitle || line.title,
              details: boardDetailsForLine(line),
            }))
          : [{ quantity: 1, name: "SmartBar ticket" }],
      },
    ],
    notes: [
      rawOrder ? `Heard: ${rawOrder}` : "SmartBar ticket",
      result.pricingMode !== "restaurant-calculated" && result.estimatedTotal ? `Total: ${result.estimatedTotal}` : "",
    ]
      .filter(Boolean)
      .join(" - "),
    readinessStatus: readiness.readinessStatus,
    readinessNote: readiness.readinessNote,
    clientId: vendorContext.clientId,
    vendorId: vendorContext.vendorId,
    displayName: vendorContext.displayName,
    menuProfileId: vendorContext.menuProfileId,
    behaviorProfileId: vendorContext.behaviorProfileId,
    boardProfileId: vendorContext.boardProfileId,
    timezone: vendorContext.timezone,
    mode: "sandbox",
  };
}

function smartBarPlaygroundCandidateSelectionSucceeded(result: SmartBarMobileOrderResult) {
  return (result.lines || []).some((line) => line.status !== "unknown" && !line.isCustomerNote);
}

function smartBarPlaygroundCandidateSelectionFailureResult(
  lines: SmartBarMobileOrderLine[],
  pricingMode: string,
  estimatedTotal: string,
  reason: unknown,
): SmartBarMobileOrderResult {
  const message = String(reason || "That choice did not finish. Tap it to try again.")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);

  return {
    lines,
    pricingMode,
    estimatedTotal,
    preserveResultLinesOnRetry: true,
    candidateSelectionFailed: true,
    candidateSelectionFailureMessage: message || "That choice did not finish. Tap it to try again.",
  };
}

export default function SmartBarPlayground({
  onBack,
  onMainMenu,
  onRequestSetup,
  vendorContext,
}: SmartBarPlaygroundProps) {
  const carryoutOrderRef = useRef<CarryoutOrder | null>(null);
  const orderLinesRef = useRef<SmartBarMobileOrderLine[]>([]);
  const pricingModeRef = useRef<string>("exact");
  const estimatedTotalRef = useRef("-");
  const choiceMutationSequenceRef = useRef(0);
  const latestPromptRef = useRef("");
  const ticketSequenceRef = useRef(184);
  const activeOrderTicketIdRef = useRef<string | null>(null);
  const activeVendorContext = useMemo(() => normalizeSmartBarVendorContext(vendorContext), [vendorContext]);
  const pendingTicketIdRef = useRef(formatPlaygroundTicketId(184));
  const boardOrderIdsRef = useRef(new Set<string>());
  const loadBoardTicketsRequestRef = useRef(0);
  const pendingBoardOrderRef = useRef<{
    order: SmartBarOrderBoardItem;
    ticketId: string;
    fallbackTicketId: string;
  } | null>(null);
  const boardRefreshTimerRef = useRef<number | null>(null);
  const playgroundShellFrameRef = useRef<HTMLDivElement | null>(null);

  const [boardOrders, setBoardOrders] = useState<SmartBarOrderBoardItem[]>([]);
  const [sendOrderNumber, setSendOrderNumber] = useState(() => formatPlaygroundTicketId(184));
  const [, setCartOpen] = useState(false);
  const [boardExpanded, setBoardExpanded] = useState(true);
  const [activeBoardOrder, setActiveBoardOrder] = useState<SmartBarOrderBoardItem | null>(null);
  const [pickupConfirmationOpen, setPickupConfirmationOpen] = useState(false);
  const [nextStepConfirmOpen, setNextStepConfirmOpen] = useState(false);
  const [nextStepSubmitting, setNextStepSubmitting] = useState(false);
  const [nextStepRequested, setNextStepRequested] = useState(false);
  const [nextStepError, setNextStepError] = useState("");
  const [containedPanelMaxHeight, setContainedPanelMaxHeight] = useState<number | undefined>(undefined);
  const [playgroundIntroOpen, setPlaygroundIntroOpen] = useState(false);

  const playgroundCoverageMode = String(activeVendorContext.playgroundCoverageMode || "")
    .trim()
    .toLowerCase();
  const playgroundCoverageSections = useMemo(
    () => smartBarPlaygroundCoverageSections(activeVendorContext.playgroundCoverageSections),
    [activeVendorContext.playgroundCoverageSections],
  );
  const playgroundIntroEnabled =
    playgroundCoverageMode === "full" ||
    (playgroundCoverageMode === "selected" && playgroundCoverageSections.length > 0);
  useEffect(() => {
    setPlaygroundIntroOpen(playgroundIntroEnabled);
  }, [
    activeVendorContext.menuProfileId,
    activeVendorContext.vendorId,
    playgroundIntroEnabled,
  ]);

  const dismissPlaygroundIntro = useCallback(() => {
    setPlaygroundIntroOpen(false);
  }, []);

  useLayoutEffect(() => {
    const frame = playgroundShellFrameRef.current;
    if (!frame) return;

    const updateContainedPanelMaxHeight = () => {
      const frameHeight = Math.round(frame.getBoundingClientRect().height);
      const nextHeight = Math.max(260, frameHeight - 108);
      setContainedPanelMaxHeight((current) => current === nextHeight ? current : nextHeight);
    };

    updateContainedPanelMaxHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateContainedPanelMaxHeight);
      return () => window.removeEventListener("resize", updateContainedPanelMaxHeight);
    }

    const observer = new ResizeObserver(updateContainedPanelMaxHeight);
    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  const websiteSetupRequestStatus = String(activeVendorContext.websiteSetupRequestStatus || "").trim().toLowerCase();
  const websiteModeStatus = String(activeVendorContext.websiteModeStatus || "").trim().toLowerCase();
  const nextStepAlreadyRequested =
    nextStepRequested ||
    Boolean(activeVendorContext.websiteSetupRequestedUtc) ||
    ["pending", "requested", "complete", "ready"].includes(websiteSetupRequestStatus) ||
    ["requested", "installed_pending_verification", "ghost_test_ready_for_review", "ready", "live"].includes(websiteModeStatus);

  const restaurantName = String(activeVendorContext.displayName || "").trim() || "your restaurant";

  const handleRequestSetup = useCallback(async () => {
    if (nextStepSubmitting || nextStepAlreadyRequested) return;

    setNextStepSubmitting(true);
    setNextStepError("");

    try {
      await onRequestSetup();
      setNextStepRequested(true);
      setNextStepConfirmOpen(false);
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : "unknown_error";
      setNextStepError(`Request could not be sent: ${reason}`);
    } finally {
      setNextStepSubmitting(false);
    }
  }, [nextStepAlreadyRequested, nextStepSubmitting, onRequestSetup]);

  const handleCartOpenChange = useCallback((open: boolean) => {
    setCartOpen(open);
    setBoardExpanded(!open);
  }, []);

  const commitPendingBoardOrder = useCallback(() => {
    const pendingBoardOrder = pendingBoardOrderRef.current;
    if (!pendingBoardOrder) return;

    pendingBoardOrderRef.current = null;
    setBoardOrders((current) => [
      pendingBoardOrder.order,
      ...current.filter((order) => (
        order.id !== pendingBoardOrder.ticketId &&
        order.id !== pendingBoardOrder.fallbackTicketId
      )),
    ]);
  }, []);

  const handlePickupConfirmationOpenChange = useCallback((open: boolean) => {
    if (boardRefreshTimerRef.current !== null) {
      window.clearTimeout(boardRefreshTimerRef.current);
      boardRefreshTimerRef.current = null;
    }

    setPickupConfirmationOpen(open);

    if (!open) {
      setActiveBoardOrder(null);
      commitPendingBoardOrder();
      return;
    }

    if (pendingBoardOrderRef.current) {
      boardRefreshTimerRef.current = window.setTimeout(() => {
        boardRefreshTimerRef.current = null;
        commitPendingBoardOrder();
      }, SMARTBAR_PLAYGROUND_BOARD_REFRESH_DELAY_MS);
    }
  }, [commitPendingBoardOrder]);

  useEffect(() => () => {
    if (boardRefreshTimerRef.current !== null) {
      window.clearTimeout(boardRefreshTimerRef.current);
      boardRefreshTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = loadBoardTicketsRequestRef.current + 1;
    loadBoardTicketsRequestRef.current = requestId;

    async function loadPersistedBoardTickets() {
      try {
        const tickets = await listPersistentSmartBarTickets(activeVendorContext);
        if (cancelled || loadBoardTicketsRequestRef.current !== requestId) return;

        const loadedOrders = tickets.map((ticket) => smartBarPersistedTicketToBoardOrder(ticket, activeVendorContext));
        loadedOrders.forEach((order) => boardOrderIdsRef.current.add(order.id));

        setBoardOrders((current) => {
          const currentById = new Map(current.map((order) => [order.id, order]));
          const loadedIds = new Set(loadedOrders.map((order) => order.id));
          const mergedLoadedOrders = loadedOrders.map((order) => {
            const existing = currentById.get(order.id);
            return existing
              ? {
                  ...order,
                  status: existing.status,
                  score: existing.score,
                  scoreNote: existing.scoreNote,
                }
              : order;
          });
          const localOnlyOrders = current.filter((order) => !loadedIds.has(order.id));

          return [...mergedLoadedOrders, ...localOnlyOrders];
        });
      } catch (error) {
        console.warn("SmartBar ticket list failed", error);
      }
    }

    loadPersistedBoardTickets();

    return () => {
      cancelled = true;
    };
  }, [activeVendorContext]);

  const forceProductionCart = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("playgroundCart") === "1";
  }, []);

  const forcedCartSubmission = useMemo(() => (
    forceProductionCart
      ? {
          id: 9001,
          query: "double cheeseburger combo no onions, large fries, large diet coke",
          typing: false,
          submitDelayMs: 0,
        }
      : null
  ), [forceProductionCart]);

  const reserveActiveTicketId = useCallback(() => {
    if (activeOrderTicketIdRef.current) return activeOrderTicketIdRef.current;

    const ticketId = formatPlaygroundTicketId(ticketSequenceRef.current);
    ticketSequenceRef.current += 1;
    activeOrderTicketIdRef.current = ticketId;
    pendingTicketIdRef.current = ticketId;
    setSendOrderNumber(ticketId);
    return ticketId;
  }, []);

  const handleSubmitPrompt = useCallback(async (query: string, meta?: SmartBarMobileSubmitMeta) => {
    choiceMutationSequenceRef.current += 1;
    const replacingUnknown = meta?.intent === "replace_unknown";
    const currentLines = orderLinesRef.current;
    const previousLines = replacingUnknown
      ? smartBarMobileFilterReplacementLine(currentLines, meta)
      : currentLines;
    const previousEstimatedTotal = estimatedTotalRef.current;
    const previousPricingMode = pricingModeRef.current;
    const existingCarryoutOrder = replacingUnknown
      ? smartBarMobileRemoveReplacementFromCarryoutOrder(carryoutOrderRef.current, meta)
      : carryoutOrderRef.current;
    const hasExistingCart = Boolean(existingCarryoutOrder || previousLines.length > 0);
    const shouldUseExistingCart = smartBarMobileQueryShouldUseExistingCart(query, hasExistingCart);
    const carryoutOrderForPrompt = shouldUseExistingCart ? existingCarryoutOrder : null;
    const promptQuery = meta?.candidateSelection?.sourceText
      ? meta.candidateSelection.sourceText
      : replacingUnknown && meta?.replaceLineTitle
        ? `replace ${meta.replaceLineTitle} with ${query}`
        : query;

    if (!replacingUnknown) {
      reserveActiveTicketId();
      latestPromptRef.current = query;
      setBoardExpanded(false);
    }

    setCartOpen(true);

    try {
      const result = await smartBarMobileResultFromGuideAi(
        promptQuery,
        carryoutOrderForPrompt,
        activeVendorContext,
        meta?.candidateSelection,
        meta?.requestIntent,
      );

      if (meta?.candidateSelection && !smartBarPlaygroundCandidateSelectionSucceeded(result)) {
        const unresolvedLine = (result.lines || []).find((line) => line.status === "unknown");
        return smartBarPlaygroundCandidateSelectionFailureResult(
          currentLines,
          previousPricingMode,
          previousEstimatedTotal,
          unresolvedLine?.helper || unresolvedLine?.details?.[0],
        );
      }

      const linesWithAiTrace = smartBarPlaygroundApplyGrayAiTraces(
        result.lines,
        result.carryoutOrder ?? null,
      );
      const resultForMerge = {
        ...result,
        pricingMode: result.pricingMode || previousPricingMode,
        lines: smartBarPlaygroundEnsureRetryReplacementLine(
          smartBarMobileFilterReplacementLine(linesWithAiTrace, meta),
          previousLines,
          query,
          meta,
        ),
      };
      const mergedResultBase = smartBarMobileMergeOrderResults(
        resultForMerge,
        previousLines,
        previousEstimatedTotal,
        shouldUseExistingCart,
      );
      const mergedLines = smartBarMobilePreserveAttachedCustomerNotes(
        mergedResultBase.lines,
        previousLines,
      );
      const mergedResult = replacingUnknown
        ? { ...mergedResultBase, lines: mergedLines, preserveResultLinesOnRetry: true }
        : { ...mergedResultBase, lines: mergedLines };

      orderLinesRef.current = mergedResult.lines;
      pricingModeRef.current = String(mergedResult.pricingMode || previousPricingMode);
      estimatedTotalRef.current = pricingModeRef.current === "restaurant-calculated"
        ? ""
        : mergedResult.estimatedTotal || previousEstimatedTotal;
      carryoutOrderRef.current = smartBarMobileMergeCarryoutOrders(
        carryoutOrderForPrompt,
        smartBarMobileRemoveReplacementFromCarryoutOrder(result.carryoutOrder ?? null, meta),
        shouldUseExistingCart,
      );

      return mergedResult;
    } catch (error) {
      console.warn("SmartBar playground guide API failed", error);

      if (meta?.candidateSelection) {
        const reason = error instanceof Error && error.message
          ? error.message
          : "That choice did not finish. Tap it to try again.";
        return smartBarPlaygroundCandidateSelectionFailureResult(
          currentLines,
          previousPricingMode,
          previousEstimatedTotal,
          reason,
        );
      }

      const errorResult = {
        ...smartBarMobileApiErrorResult(promptQuery, error),
        pricingMode: previousPricingMode,
      };
      const mergedErrorResultBase = smartBarMobileMergeOrderResults(
        errorResult,
        previousLines,
        previousEstimatedTotal,
        shouldUseExistingCart,
      );
      const mergedErrorLines = smartBarMobilePreserveAttachedCustomerNotes(
        mergedErrorResultBase.lines,
        previousLines,
      );
      const mergedErrorResult = replacingUnknown
        ? { ...mergedErrorResultBase, lines: mergedErrorLines, preserveResultLinesOnRetry: true }
        : { ...mergedErrorResultBase, lines: mergedErrorLines };

      orderLinesRef.current = mergedErrorResult.lines;
      pricingModeRef.current = String(mergedErrorResult.pricingMode || previousPricingMode);
      estimatedTotalRef.current = pricingModeRef.current === "restaurant-calculated"
        ? ""
        : mergedErrorResult.estimatedTotal || previousEstimatedTotal;
      carryoutOrderRef.current = carryoutOrderForPrompt;

      return mergedErrorResult;
    }
  }, [activeVendorContext, reserveActiveTicketId]);

  const handleApplyLineChoice = useCallback(async (
    line: SmartBarMobileOrderLine,
    value: string,
    meta?: SmartBarMobileApplyChoiceMeta,
  ) => {
    const mutationSequence = choiceMutationSequenceRef.current + 1;
    choiceMutationSequenceRef.current = mutationSequence;
    const previousEstimatedTotal = estimatedTotalRef.current;
    const pricingMode = pricingModeRef.current;
    const restaurantCalculatedPricing = pricingMode === "restaurant-calculated";
    const optimisticCarryoutOrder = smartBarMobileApplyChoiceToCarryoutOrder(
      carryoutOrderRef.current,
      line,
      value,
      meta?.selected ?? true,
      meta?.quantity,
      meta?.optionGroupId,
    );
    const previousVisibleLines = orderLinesRef.current;
    const nextLines = smartBarMobilePreserveAttachedCustomerNotes(
      smartBarMobileApplyChoiceToVisibleLines(
        previousVisibleLines,
        line,
        value,
        meta?.selected ?? true,
        optimisticCarryoutOrder,
        meta?.quantity,
        meta?.optionGroupId,
      ),
      previousVisibleLines,
    );
    const optimisticEstimatedTotal = restaurantCalculatedPricing
      ? ""
      : previousEstimatedTotal && previousEstimatedTotal !== "-"
        ? previousEstimatedTotal
        : smartBarMobileEstimatedTotalFromLines(nextLines);

    orderLinesRef.current = nextLines;
    estimatedTotalRef.current = optimisticEstimatedTotal;
    carryoutOrderRef.current = optimisticCarryoutOrder;

    const optimisticResult = {
      lines: nextLines,
      pricingMode,
      estimatedTotal: restaurantCalculatedPricing ? undefined : optimisticEstimatedTotal,
    };

    if (!optimisticCarryoutOrder) return optimisticResult;

    // Restaurant-calculated profiles have no price to refresh. The local
    // line-scoped reducer has already applied the exact choice to the exact
    // line and canonical carryout order. Sending the cart through the AI
    // "review" path can rewrite unrelated lines and consumes unnecessary
    // tokens, so the deterministic optimistic result is authoritative here.
    if (!smartBarPlaygroundShouldRequestChoiceRefresh(pricingMode)) {
      return optimisticResult;
    }

    try {
      const groupContext = meta?.optionGroupLabel || line.optionGroupLabel || meta?.optionGroupId || line.activeOptionGroupId;
      const repricedResult = await smartBarMobileRepriceCartFromGuideAi(
        optimisticCarryoutOrder,
        `${meta?.selected === false ? "deselected" : meta?.quantity === 2 ? "doubled" : "selected"} ${value} for ${line.title}${groupContext ? ` in ${groupContext}` : ""}`,
        activeVendorContext,
      );

      if (choiceMutationSequenceRef.current !== mutationSequence) {
        return {
          lines: orderLinesRef.current,
          pricingMode: pricingModeRef.current,
          estimatedTotal: pricingModeRef.current === "restaurant-calculated" ? undefined : estimatedTotalRef.current,
        };
      }

      const repricedLines = smartBarPlaygroundApplyPricingOnly(
        orderLinesRef.current,
        repricedResult.lines,
      );
      orderLinesRef.current = repricedLines;
      pricingModeRef.current = String(repricedResult.pricingMode || pricingMode);
      estimatedTotalRef.current = pricingModeRef.current === "restaurant-calculated"
        ? ""
        : repricedResult.estimatedTotal || optimisticEstimatedTotal;

      // The exact local carryout mutation remains authoritative. A downstream
      // whole-cart response may contribute pricing only; it may never replace
      // another line's selections, required state, status, or canonical cart.
      carryoutOrderRef.current = optimisticCarryoutOrder;

      return {
        ...repricedResult,
        lines: repricedLines,
        carryoutOrder: optimisticCarryoutOrder,
        pricingMode: pricingModeRef.current,
        estimatedTotal: pricingModeRef.current === "restaurant-calculated"
          ? undefined
          : repricedResult.estimatedTotal || optimisticEstimatedTotal,
      };
    } catch (error) {
      console.warn("SmartBar playground reprice failed after choice", error);
      if (choiceMutationSequenceRef.current !== mutationSequence) {
        return {
          lines: orderLinesRef.current,
          pricingMode: pricingModeRef.current,
          estimatedTotal: pricingModeRef.current === "restaurant-calculated" ? undefined : estimatedTotalRef.current,
        };
      }
      return optimisticResult;
    }
  }, [activeVendorContext]);

  const handleSaveUnknownAsNote = useCallback((
    line: SmartBarMobileOrderLine,
    note: string,
  ) => {
    choiceMutationSequenceRef.current += 1;
    const nextLines = smartBarMobileSaveUnknownAsNoteInLines(
      orderLinesRef.current,
      line,
      note,
    );
    const nextCarryoutOrder = smartBarMobileRemoveLineFromCarryoutOrder(
      carryoutOrderRef.current,
      line,
    );

    orderLinesRef.current = nextLines;
    carryoutOrderRef.current = nextCarryoutOrder;

    return {
      lines: nextLines,
      pricingMode: pricingModeRef.current,
      estimatedTotal: pricingModeRef.current === "restaurant-calculated" ? undefined : estimatedTotalRef.current,
    };
  }, []);

  const handleAttachUnknownAsNote = useCallback((
    line: SmartBarMobileOrderLine,
    targetLine: SmartBarMobileOrderLine,
    note: string,
  ) => {
    choiceMutationSequenceRef.current += 1;
    const nextLines = smartBarMobileAttachUnknownNoteToLineInLines(
      orderLinesRef.current,
      line,
      targetLine,
      note,
    );
    const nextCarryoutOrder = smartBarMobileRemoveLineFromCarryoutOrder(
      carryoutOrderRef.current,
      line,
    );

    orderLinesRef.current = nextLines;
    carryoutOrderRef.current = nextCarryoutOrder;

    return {
      lines: nextLines,
      pricingMode: pricingModeRef.current,
      estimatedTotal: pricingModeRef.current === "restaurant-calculated" ? undefined : estimatedTotalRef.current,
    };
  }, []);

  const handleRemoveLine = useCallback((line: SmartBarMobileOrderLine) => {
    choiceMutationSequenceRef.current += 1;
    const nextLines = smartBarMobileRemoveVisibleLine(orderLinesRef.current, line);
    const restaurantCalculatedPricing = pricingModeRef.current === "restaurant-calculated";
    const nextEstimatedTotal = restaurantCalculatedPricing
      ? ""
      : nextLines.length ? smartBarMobileEstimatedTotalFromLines(nextLines) : "-";
    const nextCarryoutOrder = smartBarMobileRemoveLineFromCarryoutOrder(
      carryoutOrderRef.current,
      line,
    );

    orderLinesRef.current = nextLines;
    estimatedTotalRef.current = nextEstimatedTotal;
    carryoutOrderRef.current = nextCarryoutOrder;

    // Deletion is authoritative local cart state. Repricing through guide_ai
    // here can echo an older cart and visibly restore the row that was just
    // removed. Remaining line prices already determine the updated total.
    return {
      lines: nextLines,
      pricingMode: pricingModeRef.current,
      estimatedTotal: restaurantCalculatedPricing ? undefined : nextEstimatedTotal,
    };
  }, []);

  const handleCartReady = useCallback((result: SmartBarMobileOrderResult) => {
    setCartOpen(true);
    orderLinesRef.current = result.lines;
    pricingModeRef.current = String(result.pricingMode || pricingModeRef.current);
    estimatedTotalRef.current = pricingModeRef.current === "restaurant-calculated"
      ? ""
      : result.estimatedTotal || estimatedTotalRef.current;
  }, []);

  const handleOrderSent = useCallback(async () => {
    const fallbackTicketId = activeOrderTicketIdRef.current || pendingTicketIdRef.current || sendOrderNumber;
    if (!fallbackTicketId || boardOrderIdsRef.current.has(fallbackTicketId)) return fallbackTicketId;

    boardOrderIdsRef.current.add(fallbackTicketId);

    const currentResult = {
      lines: orderLinesRef.current,
      pricingMode: pricingModeRef.current,
      estimatedTotal: pricingModeRef.current === "restaurant-calculated" ? undefined : estimatedTotalRef.current,
    };
    const rawOrder = latestPromptRef.current || "SmartBar order";

    let ticketId = fallbackTicketId;
    let persistedTicket: SmartBarTicketCreateResponse | null = null;

    try {
      persistedTicket = await createPersistentSmartBarTicket(
        currentResult,
        rawOrder,
        activeVendorContext,
      );

      ticketId = persistedTicket?.ticketDisplayId || persistedTicket?.ticketNumber || fallbackTicketId;
    } catch (error) {
      console.error("SmartBar ticket persistence failed", error);
    }

    boardOrderIdsRef.current.add(ticketId);

    const boardOrderBase = createBoardOrderFromResult(
      currentResult,
      rawOrder,
      ticketId,
      activeVendorContext,
    );
    const boardOrder = {
      ...boardOrderBase,
      backendTicketId: persistedTicket?.ticketId,
      businessDate: persistedTicket?.businessDate,
      mode: persistedTicket?.mode || "sandbox",
      readinessStatus: persistedTicket?.readinessStatus || boardOrderBase.readinessStatus,
      readinessNote: persistedTicket?.readinessNote || boardOrderBase.readinessNote,
      score: smartBarManagerScoreFromValue(persistedTicket?.managerScoreStatus),
      scoreNote: persistedTicket?.managerScoreNote || "",
    };

    setSendOrderNumber(ticketId);
    pendingBoardOrderRef.current = {
      order: boardOrder,
      ticketId,
      fallbackTicketId,
    };
    setBoardExpanded(true);

    return ticketId;
  }, [activeVendorContext, sendOrderNumber]);

  const handleBoardEntered = useCallback((orderId: string) => {
    setActiveBoardOrder(null);
    setBoardOrders((current) => current.map((order) => (
      order.id === orderId ? { ...order, status: "entered" } : order
    )));
  }, []);

  const handleBoardScore = useCallback(async (orderId: string, score: SmartBarTicketManagerScore, note = "") => {
    const currentOrder = activeBoardOrder?.id === orderId
      ? activeBoardOrder
      : boardOrders.find((order) => order.id === orderId) || null;

    const normalizedNote = score === "needs_fix" ? note : "";

    setBoardOrders((current) => current.map((order) => (
      order.id === orderId ? { ...order, score, scoreNote: normalizedNote } : order
    )));
    setActiveBoardOrder((current) => (
      current && current.id === orderId ? { ...current, score, scoreNote: normalizedNote } : current
    ));

    if (!currentOrder?.backendTicketId) return;

    try {
      const updatedTicket = await updatePersistentSmartBarTicketScore(
        currentOrder,
        score,
        normalizedNote,
        activeVendorContext,
      );

      if (!updatedTicket) return;

      const savedScore = smartBarManagerScoreFromValue(updatedTicket.managerScoreStatus) || score;
      const savedNote = updatedTicket.managerScoreNote || "";

      setBoardOrders((current) => current.map((order) => (
        order.id === orderId ? { ...order, score: savedScore, scoreNote: savedNote } : order
      )));
      setActiveBoardOrder((current) => (
        current && current.id === orderId ? { ...current, score: savedScore, scoreNote: savedNote } : current
      ));
    } catch (error) {
      console.error("SmartBar ticket manager score persistence failed", error);
    }
  }, [activeBoardOrder, activeVendorContext, boardOrders]);

  const handleResetCart = useCallback(() => {
    choiceMutationSequenceRef.current += 1;
    carryoutOrderRef.current = null;
    orderLinesRef.current = [];
    pricingModeRef.current = "exact";
    estimatedTotalRef.current = "-";
    latestPromptRef.current = "";
    activeOrderTicketIdRef.current = null;
    pendingTicketIdRef.current = formatPlaygroundTicketId(ticketSequenceRef.current);
    setSendOrderNumber(pendingTicketIdRef.current);
    setCartOpen(false);
    setBoardExpanded(true);
  }, []);

  const boardIsCompact = !boardExpanded || forceProductionCart;

  return (
    <div className="relative mx-auto mt-0 w-full max-w-[430px]">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center rounded-full bg-white/82 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="inline-flex items-center rounded-full bg-white/68 px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:bg-white/88 hover:text-slate-950"
          >
            <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
            Main Menu
          </button>
        </div>

        <button
          type="button"
          aria-expanded={nextStepConfirmOpen}
          aria-controls="smartbar-next-step-panel"
          disabled={nextStepAlreadyRequested}
          onClick={() => {
            setNextStepError("");
            setNextStepConfirmOpen((open) => !open);
          }}
          className={[
            "inline-flex shrink-0 items-center justify-center rounded-full px-3 py-2 text-xs font-bold shadow-[0_8px_20px_rgba(5,150,105,0.24)] ring-1 transition",
            nextStepAlreadyRequested
              ? "cursor-default bg-emerald-100 text-emerald-700 ring-emerald-200"
              : "bg-emerald-600 text-white ring-emerald-500 hover:-translate-y-0.5 hover:bg-emerald-700",
          ].join(" ")}
        >
          {nextStepAlreadyRequested ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Request sent
            </>
          ) : (
            <>
              Get SmartBar
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {nextStepConfirmOpen && !nextStepAlreadyRequested ? (
        <div
          id="smartbar-next-step-panel"
          role="dialog"
          aria-label="Request SmartBar setup"
          className="absolute right-1 top-11 z-[120] w-[320px] max-w-[calc(100%_-_8px)] rounded-[22px] bg-white/95 p-4 shadow-[0_20px_55px_rgba(15,23,42,0.22)] ring-1 ring-slate-200 backdrop-blur-xl"
        >
          <div className="text-base font-black tracking-tight text-slate-950">
            Ready for the next step?
          </div>
          <div className="mt-1.5 text-sm font-medium leading-5 text-slate-600">
            Ask us to contact you about launching SmartBar for{" "}
            <span className="font-bold text-slate-800">{restaurantName}</span>.
          </div>

          {nextStepError ? (
            <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
              {nextStepError}
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={nextStepSubmitting}
              onClick={() => void handleRequestSetup()}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,150,105,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
            >
              {nextStepSubmitting ? "Sending..." : "Yes, contact me"}
            </button>
            <button
              type="button"
              disabled={nextStepSubmitting}
              onClick={() => {
                setNextStepError("");
                setNextStepConfirmOpen(false);
              }}
              className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-60"
            >
              Not yet
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative h-[min(650px,calc(100svh-132px))] min-h-[560px] overflow-hidden rounded-[34px] bg-[#e9f6ff] shadow-[0_24px_70px_rgba(14,116,144,0.16)] ring-1 ring-sky-100/90">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.88),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.44),rgba(232,246,255,0.26))]" />

        {playgroundIntroEnabled && !playgroundIntroOpen && !pickupConfirmationOpen ? (
          <button
            type="button"
            onClick={() => setPlaygroundIntroOpen(true)}
            className="absolute left-3 top-3 z-[80] inline-flex items-center rounded-full bg-white/92 px-3 py-2 text-xs font-bold text-sky-800 shadow-[0_10px_24px_rgba(14,116,144,0.18)] ring-1 ring-sky-200/90 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
            aria-label={`Open playground coverage information for ${restaurantName}`}
          >
            <Info className="mr-1.5 h-3.5 w-3.5" />
            Coverage
          </button>
        ) : null}

        {playgroundIntroEnabled && playgroundIntroOpen ? (
          <div className="absolute inset-0 z-[130] flex items-center justify-center bg-slate-950/28 p-4 backdrop-blur-[3px]">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="smartbar-playground-intro-title"
              aria-describedby="smartbar-playground-intro-description"
              className="w-full max-w-[370px] rounded-[28px] bg-white/96 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.30)] ring-1 ring-white/90 backdrop-blur-xl"
            >
              <div
                title={restaurantName}
                className="inline-flex max-w-full items-center justify-center whitespace-normal break-words rounded-[18px] bg-sky-100 px-4 py-2 text-center text-xs font-black leading-4 text-sky-800 ring-1 ring-sky-200/80"
              >
                {restaurantName}
              </div>

              <h2
                id="smartbar-playground-intro-title"
                className="mt-3 text-[24px] font-black leading-[1.05] tracking-tight text-slate-950"
              >
                Order like a customer
              </h2>

              <div
                id="smartbar-playground-intro-description"
                className="mt-4 rounded-[20px] bg-sky-50/90 p-4 ring-1 ring-sky-100"
              >
                <div className="text-xs font-black uppercase tracking-[0.12em] text-sky-800">
                  {playgroundCoverageMode === "full"
                    ? "This playground includes"
                    : "This playground covers"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(playgroundCoverageMode === "full"
                    ? ["Full menu"]
                    : playgroundCoverageSections
                  ).map((section) => (
                    <span
                      key={section}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-sky-100"
                    >
                      {section}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm font-medium leading-5 text-slate-600">
                <p>
                 <span className="font-bold text-slate-900">SmartBar</span>{" "} tells you what to do. 
                  The <span className="font-bold text-slate-900">Order Board</span>{" "} shows you what gets sent in.
                  
                </p>
              </div>

              <button
                type="button"
                onClick={dismissPlaygroundIntro}
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-sky-700 px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(3,105,161,0.28)] transition hover:-translate-y-0.5 hover:bg-sky-800"
              >
                Start ordering
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {pickupConfirmationOpen ? (
          <div className={[
            "absolute inset-x-3 top-3 z-30 overflow-hidden rounded-[28px] bg-white/58 shadow-[0_16px_36px_rgba(14,116,144,0.12)] ring-1 ring-white/80 transition-all duration-300",
            boardIsCompact ? "h-[92px]" : "h-[286px]",
          ].join(" ")}
          >
            <SmartBarOrderBoardMock
              demoOrders={boardOrders}
              demoSocialPortrait
              demoCompactBoard
              demoFourTileBoard
              demoFlatBoardTiles={boardIsCompact}
              demoMaxVisibleOrders={4}
              demoAnimateIncomingOrders
              demoPlaygroundSheet
              demoHeaderEyebrow="What the restaurant sees"
              demoHeaderTitle="Orders arrive here"
              demoHeaderDescription="Received on the restaurant’s tablet or phone."
              onDemoOpenOrder={setActiveBoardOrder}
              className={boardIsCompact ? "!min-h-0 h-full overflow-hidden !px-3 !py-1.5" : "!min-h-0 h-full overflow-hidden !px-3 !py-3"}
              onDemoEntered={handleBoardEntered}
            />
          </div>
        ) : null}

        <div className={[
          "absolute inset-x-0 bottom-0 z-40 overflow-visible [transform:translateZ(0)] transition-all duration-300",
          pickupConfirmationOpen
            ? boardIsCompact ? "top-[108px]" : "top-[306px]"
            : "top-0",
        ].join(" ")}
          ref={playgroundShellFrameRef}
        >
          <SmartBarMobileShell
            mode="overlay"
            introCallout={{ title: "Tap to say or type your order" }}
            sendOrderNumber={sendOrderNumber}
            demoBottomLiftPx={16}
            containedPanelMaxHeight={containedPanelMaxHeight}
            demoSubmission={forcedCartSubmission}
            onSubmitPrompt={handleSubmitPrompt}
            onApplyLineChoice={handleApplyLineChoice}
            onRemoveLine={handleRemoveLine}
            onSaveUnknownAsNote={handleSaveUnknownAsNote}
            onAttachUnknownAsNote={handleAttachUnknownAsNote}
            onCartReady={handleCartReady}
            onCartOpenChange={handleCartOpenChange}
            onPickupConfirmationOpenChange={handlePickupConfirmationOpenChange}
            onOrderSent={handleOrderSent}
            onResetCart={handleResetCart}
          />
        </div>

        {pickupConfirmationOpen && activeBoardOrder ? (
          <SmartBarOrderSheet
            order={activeBoardOrder}
            onClose={() => setActiveBoardOrder(null)}
            onMarkEntered={handleBoardEntered}
            onScoreOrder={handleBoardScore}
            demoSocialPortrait
            demoPlaygroundSheet
          />
        ) : null}
      </div>
    </div>
  );
}
