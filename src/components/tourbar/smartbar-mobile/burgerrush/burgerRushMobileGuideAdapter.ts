import type { CarryoutOrder, GuideAiCarryoutResponse } from "../../TourBarOrdering";
import type { SmartBarMobileOrderResult } from "../SmartBarMobileShell";
import { smartBarMobileResultFromOrder } from "./burgerRushMobileCartReducer";
import { normalizeSmartBarVendorContext, type SmartBarVendorContext } from "../SmartBarVendorContext";

const SMARTBAR_MOBILE_GUIDE_AI_URL = "/api/guide_ai";
const SMARTBAR_MOBILE_AUTH_TOKEN_KEY = "tourbot_demo_token";


export type SmartBarMobileDirectCartEvent = {
  type: "select_option" | "deselect_option" | "toggle_option" | "remove_line" | string;
  lineId?: string;
  cartLineKey?: string;
  sourceLineItemId?: string;
  sourceItemId?: string;
  lineTitle?: string;
  groupId?: string;
  optionId?: string;
  optionLabel?: string;
  selected?: boolean;
};

type GuideAiDirectCartResponse = GuideAiCarryoutResponse & {
  ok?: boolean;
  message?: string;
  directCart?: SmartBarMobileOrderResult | null;
  visibleContext?: GuideAiCarryoutResponse["visibleContext"] & {
    directCart?: SmartBarMobileOrderResult | null;
  };
};

function smartBarMobileBuildGuideConfig(vendorContext?: SmartBarVendorContext | null) {
  const activeVendorContext = normalizeSmartBarVendorContext(vendorContext);

  return {
    mode: "commerce",
    label: `${activeVendorContext.displayName} Carryout`,
    catalogMode: "carryout_ordering",
    clientId: activeVendorContext.clientId,
    vendorId: activeVendorContext.vendorId,
    menuProfileId: activeVendorContext.menuProfileId,
    behaviorProfileId: activeVendorContext.behaviorProfileId,
    boardProfileId: activeVendorContext.boardProfileId,
    vendorContext: activeVendorContext,
    features: {
      refinementChips: true,
      bookingActions: true,
      navigation: true,
    },
    packIds: {
      catalog: "carryout_cart_catalog",
    },
  };
}

function smartBarMobileGetDemoToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SMARTBAR_MOBILE_AUTH_TOKEN_KEY) || "";
}

function smartBarMobileBuildGuideAiHeaders() {
  const token = smartBarMobileGetDemoToken();

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function smartBarMobileCompact(value: unknown, maxChars = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function smartBarMobileGetPageSections() {
  if (typeof document === "undefined") return [];

  return Array.from(document.querySelectorAll<HTMLElement>("section[id], [data-tour-id], [id]"))
    .slice(0, 80)
    .map((node) => {
      const id = node.getAttribute("data-tour-id") || node.id;
      const heading = node.querySelector("h1,h2,h3")?.textContent?.trim();
      const summary = smartBarMobileCompact(node.innerText || node.textContent || "", 500);

      return {
        id: id || "",
        label: heading || id || "Page section",
        summary,
      };
    })
    .filter((section) => section.id && section.summary);
}

export function smartBarMobileApiErrorResult(query: string, error: unknown): SmartBarMobileOrderResult {
  const message = error instanceof Error ? error.message : String(error || "Unknown guide API error");

  return {
    lines: [
      {
        id: "guide-ai-error",
        title: query || "Guide API request",
        status: "unknown",
        helper: "Guide API blocked",
        price: "—",
        details: [message],
        retryPrompt: "Check the Vite proxy, Functions host, and Network tab, then try again.",
      },
    ],
    estimatedTotal: "—",
  };
}

export async function smartBarMobileResultFromGuideAi(
  query: string,
  carryoutOrder: CarryoutOrder | null,
  vendorContext?: SmartBarVendorContext | null,
): Promise<SmartBarMobileOrderResult & { carryoutOrder?: CarryoutOrder | null }> {
  const activeVendorContext = normalizeSmartBarVendorContext(vendorContext);
  const response = await fetch(SMARTBAR_MOBILE_GUIDE_AI_URL, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: smartBarMobileBuildGuideAiHeaders(),
    body: JSON.stringify({
      mode: "commerce",
      guideConfig: smartBarMobileBuildGuideConfig(activeVendorContext),
      message: query,
      clientId: activeVendorContext.clientId,
      vendorId: activeVendorContext.vendorId,
      menuProfileId: activeVendorContext.menuProfileId,
      behaviorProfileId: activeVendorContext.behaviorProfileId,
      boardProfileId: activeVendorContext.boardProfileId,
      vendorContext: activeVendorContext,
      conversationContext: {
        singleTurn: !carryoutOrder,
        lastUserMessage: query,
        recentUserMessages: [query],
        commerceContext: {
          carryoutOrder,
          vendorContext: activeVendorContext,
        },
      },
      visibleContext: {
        carryoutOrder,
        vendorContext: activeVendorContext,
      },
      pageContext: {
        url: typeof window !== "undefined" ? window.location.href : "",
        title: typeof document !== "undefined" ? document.title : `${activeVendorContext.displayName} Carryout`,
        sections: smartBarMobileGetPageSections(),
        vendorContext: activeVendorContext,
      },
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? ((await response.json().catch(() => ({}))) as GuideAiCarryoutResponse & { message?: string })
    : ({ message: await response.text().catch(() => "") } as GuideAiCarryoutResponse & { message?: string });

  if (!response.ok) {
    const message = body.answer || body.message || body.body || `HTTP ${response.status}`;
    throw new Error(`Guide API ${response.status}: ${smartBarMobileCompact(message, 260)}`);
  }

  const order = body.carryoutOrder ?? body.visibleContext?.carryoutOrder ?? null;
  const result = smartBarMobileResultFromOrder(order, query);

  if (!order) {
    return {
      lines: [
        {
          id: "guide-ai-no-order",
          title: query || "Guide API response",
          status: "unknown",
          helper: "Guide API returned no cart",
          price: "—",
          details: [smartBarMobileCompact(body.answer || body.message || body.body || "No carryoutOrder found.", 260)],
          retryPrompt: "Check the guide response shape before trying again.",
        },
      ],
      estimatedTotal: "—",
    };
  }

  return { ...result, carryoutOrder: order };
}


export async function smartBarMobileDirectResultFromGuideAi(
  query: string,
  currentCart: SmartBarMobileOrderResult | null,
  vendorContext?: SmartBarVendorContext | null,
  directCartEvent?: SmartBarMobileDirectCartEvent | null,
): Promise<SmartBarMobileOrderResult> {
  const activeVendorContext = normalizeSmartBarVendorContext(vendorContext);
  const response = await fetch(SMARTBAR_MOBILE_GUIDE_AI_URL, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: smartBarMobileBuildGuideAiHeaders(),
    body: JSON.stringify({
      mode: "commerce",
      interpretationMode: "backend-owned-card",
      carryoutInterpretationMode: "backend-owned-card",
      guideConfig: {
        ...smartBarMobileBuildGuideConfig(activeVendorContext),
        interpretationMode: "backend-owned-card",
        carryoutInterpretationMode: "backend-owned-card",
      },
      message: query,
      directCart: currentCart,
      currentCard: currentCart,
      directCartEvent: directCartEvent || null,
      clientId: activeVendorContext.clientId,
      vendorId: activeVendorContext.vendorId,
      menuProfileId: activeVendorContext.menuProfileId,
      behaviorProfileId: activeVendorContext.behaviorProfileId,
      boardProfileId: activeVendorContext.boardProfileId,
      vendorContext: activeVendorContext,
      conversationContext: {
        singleTurn: !currentCart,
        lastUserMessage: query,
        recentUserMessages: [query],
        directCart: currentCart,
        currentCard: currentCart,
        directCartEvent: directCartEvent || null,
        commerceContext: {
          directCart: currentCart,
          currentCard: currentCart,
          directCartEvent: directCartEvent || null,
          vendorContext: activeVendorContext,
        },
      },
      visibleContext: {
        directCart: currentCart,
        currentCard: currentCart,
        vendorContext: activeVendorContext,
        interpretationMode: "backend-owned-card",
      },
      pageContext: {
        url: typeof window !== "undefined" ? window.location.href : "",
        title: typeof document !== "undefined" ? document.title : `${activeVendorContext.displayName} Carryout`,
        sections: smartBarMobileGetPageSections(),
        vendorContext: activeVendorContext,
      },
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? ((await response.json().catch(() => ({}))) as GuideAiDirectCartResponse)
    : ({ message: await response.text().catch(() => "") } as GuideAiDirectCartResponse);

  if (!response.ok || body.ok === false) {
    const message = body.answer || body.message || body.body || `HTTP ${response.status}`;
    throw new Error(`Guide API ${response.status}: ${smartBarMobileCompact(message, 260)}`);
  }

  const directCart = body.directCart ?? body.visibleContext?.directCart ?? null;
  if (!directCart || !Array.isArray(directCart.lines)) {
    throw new Error(
      `Guide API returned no AI direct cart: ${smartBarMobileCompact(
        body.answer || body.message || body.body || "No directCart found.",
        260,
      )}`,
    );
  }

  // The live ordering path stores and renders this complete AI replacement cart.
  // It is not converted into carryoutOrder and is not merged with stale cart state.
  return directCart;
}

export async function smartBarMobileRepriceCartFromGuideAi(
  carryoutOrder: CarryoutOrder,
  reason: string,
  vendorContext?: SmartBarVendorContext | null,
): Promise<SmartBarMobileOrderResult & { carryoutOrder?: CarryoutOrder | null }> {
  const query = [
    "Reprice the current BurgerRush carryout cart.",
    "Do not add, remove, rename, or reinterpret items.",
    "Use the provided carryoutOrder as the cart source of truth.",
    "Return the same cart with authoritative item prices, subtotal, estimated tax, and estimated total.",
    reason ? `Cart change: ${reason}.` : "",
  ].filter(Boolean).join(" ");

  return smartBarMobileResultFromGuideAi(query, carryoutOrder, vendorContext);
}
