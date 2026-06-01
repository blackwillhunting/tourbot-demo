import type { CarryoutOrder, GuideAiCarryoutResponse } from "../../TourBarOrdering";
import type { SmartBarMobileOrderResult } from "../SmartBarMobileShell";
import { smartBarMobileResultFromOrder } from "./burgerRushMobileCartReducer";

const SMARTBAR_MOBILE_GUIDE_AI_URL = "/api/guide_ai";
const SMARTBAR_MOBILE_AUTH_TOKEN_KEY = "tourbot_demo_token";

function smartBarMobileBuildGuideConfig() {
  return {
    mode: "commerce",
    label: "BurgerRush Carryout",
    catalogMode: "carryout_ordering",
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
): Promise<SmartBarMobileOrderResult & { carryoutOrder?: CarryoutOrder | null }> {
  const response = await fetch(SMARTBAR_MOBILE_GUIDE_AI_URL, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: smartBarMobileBuildGuideAiHeaders(),
    body: JSON.stringify({
      mode: "commerce",
      guideConfig: smartBarMobileBuildGuideConfig(),
      message: query,
      conversationContext: {
        singleTurn: !carryoutOrder,
        lastUserMessage: query,
        recentUserMessages: [query],
        commerceContext: {
          carryoutOrder,
        },
      },
      visibleContext: {
        carryoutOrder,
      },
      pageContext: {
        url: typeof window !== "undefined" ? window.location.href : "",
        title: typeof document !== "undefined" ? document.title : "BurgerRush Carryout",
        sections: smartBarMobileGetPageSections(),
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

