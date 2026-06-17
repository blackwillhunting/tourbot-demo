import FoodTrioMobileExperience from "./components/tourbar/smartbar-mobile/food-trio/FoodTrioMobileExperience";
import React, { useEffect, useState, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppCommerce from "./App-Commerce";
import AppCarryout from "./App-Carryout";
import AppCustomerCarryout from "./App-CustomerCarryout";
import LaunchSelector from "./LaunchSelector";
import LaunchSelectorTourBar from "./LaunchSelector_TourBar";
import SmartBarSpeedDemo from "./components/tourbar/speed-demo/SmartBarSpeedDemo";
import SmartBarMobileShell from "./components/tourbar/smartbar-mobile/SmartBarMobileShell";
import SmartBarMobileGlassLab from "./components/tourbar/smartbar-mobile/SmartBarMobileGlassLab";
import BurgerRushMobileExperience from "./components/tourbar/smartbar-mobile/burgerrush/BurgerRushMobileExperience";
import NexaPathMobileExperience from "./components/tourbar/smartbar-mobile/nexapath/NexaPathMobileExperience";
import DomiMobileExperience from "./components/tourbar/smartbar-mobile/domi/DomiMobileExperience";
import SmartBarMobileFinaleExperience from "./components/tourbar/smartbar-mobile/finale/SmartBarMobileFinaleExperience";
import SmartBarLiveMobileRuntime from "./components/tourbar/smartbar-mobile/SmartBarLiveMobileRuntime";
import SmartBarOrderBoardMock from "./components/tourbar/order-board/SmartBarOrderBoardMock";
import "./index.css";

const TOURBOT_AUTH_SESSION_URL = "/api/tourbot-auth/session";
const TOURBOT_AUTH_TOKEN_KEY = "tourbot_demo_token";
const TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY = "tourbot_demo_token_expires_at";
const TOURBOT_LOCAL_DEV_TOKEN = "local-dev";
const TOURBOT_LOCAL_DEV_TTL_SECONDS = 3600;
const SMARTBAR_HOSTNAMES = new Set(["smartbar.getn2ai.com"]);

function normalizedPath() {
  return window.location.pathname.replace(/\/$/, "") || "/";
}

function currentReturnTo() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function isSmartBarHostname() {
  return SMARTBAR_HOSTNAMES.has(window.location.hostname.toLowerCase());
}



function smartBarSpeedVariantFromPath(path: string) {
  if (path === "/food-trio-desktop") return "foodTrioDesktop";
  return path === "/smartbar-burgerrush" ||
    path === "/burger-rush" ||
    path === "/burger-rush-play" ||
    path === "/direct-ordering"
    ? "burgerRushOnly"
    : "full";
}

function clearStoredTourBotDemoToken() {
  window.localStorage.removeItem(TOURBOT_AUTH_TOKEN_KEY);
  window.localStorage.removeItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY);
}

function saveStoredTourBotDemoToken(token: string, expiresAt?: number) {
  window.localStorage.setItem(TOURBOT_AUTH_TOKEN_KEY, token);
  if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
    window.localStorage.setItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
  } else {
    window.localStorage.removeItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY);
  }
}

function ensureLocalDemoAuthToken() {
  if (!isLocalDemoAuthBypassEnabled()) return;

  saveStoredTourBotDemoToken(
    TOURBOT_LOCAL_DEV_TOKEN,
    Math.floor(Date.now() / 1000) + TOURBOT_LOCAL_DEV_TTL_SECONDS,
  );
}

function getStoredTourBotDemoToken() {
  const token = window.localStorage.getItem(TOURBOT_AUTH_TOKEN_KEY) || "";
  const expiresAtRaw = window.localStorage.getItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;

  if (!token) return "";

  if (expiresAt && Number.isFinite(expiresAt) && expiresAt * 1000 <= Date.now()) {
    clearStoredTourBotDemoToken();
    return "";
  }

  return token;
}

async function verifyStoredTourBotDemoToken() {
  const token = getStoredTourBotDemoToken();
  if (!token) return false;

  try {
    const response = await fetch(TOURBOT_AUTH_SESSION_URL, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      clearStoredTourBotDemoToken();
      return false;
    }

    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      expiresAt?: number;
    };

    if (body.ok !== true) {
      clearStoredTourBotDemoToken();
      return false;
    }

    if (typeof body.expiresAt === "number" && Number.isFinite(body.expiresAt)) {
      window.localStorage.setItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY, String(body.expiresAt));
    }

    return true;
  } catch {
    return false;
  }
}

function redirectToLaunchSelector() {
  const returnTo = encodeURIComponent(currentReturnTo());
  window.location.replace(`/?returnTo=${returnTo}`);
}

function isLocalDemoAuthBypassEnabled() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.has("devBypass")) return true;

  const hostname = window.location.hostname;

  return (
    ["localhost", "127.0.0.1"].includes(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname)
  );
}

function CheckingAccessScreen() {
  return (
    <main className="flex h-[100svh] items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_45%,_#f8fafc_100%)] px-6 text-slate-950 sm:h-screen">
      <div className="rounded-[28px] bg-white/80 px-6 py-5 text-center shadow-[0_18px_46px_rgba(15,23,42,0.12)] ring-1 ring-white/70 backdrop-blur-xl">
        <div className="text-sm font-semibold text-slate-950">Checking demo access</div>
        <div className="mt-1 text-sm text-slate-500">Verifying your private demo session.</div>
      </div>
    </main>
  );
}

function ProtectedDemoRoute({ children }: { children: ReactNode }) {
  const [isAllowed, setIsAllowed] = useState(() => {
    if (!isLocalDemoAuthBypassEnabled()) return false;
    ensureLocalDemoAuthToken();
    return true;
  });

  useEffect(() => {
    if (isLocalDemoAuthBypassEnabled()) {
      ensureLocalDemoAuthToken();
      setIsAllowed(true);
      return;
    }

    let isCancelled = false;

    const verify = async () => {
      const ok = await verifyStoredTourBotDemoToken();
      if (isCancelled) return;

      if (ok) {
        setIsAllowed(true);
        return;
      }

      redirectToLaunchSelector();
    };

    void verify();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (!isAllowed) return <CheckingAccessScreen />;

  return <>{children}</>;
}

function SmartBarMobileOnRealInformationalSite() {
  return <App />;
}

function Router() {
  const path = normalizedPath();

  if (path === "/smartbar-order-board" || path === "/order-board" || path === "/local-order-board") {
    return <SmartBarOrderBoardMock />;
  }

  if (path === "/smartbar-mobile-lab") {
    return <SmartBarMobileShell />;
  }

  if (path === "/burger-rush-glass-lab") {
    return <SmartBarMobileGlassLab />;
  }

  if (path === "/smartbar-mobile-live-test") {
    return (
      <ProtectedDemoRoute>
        <SmartBarLiveMobileRuntime lane="informational" />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/burger-rush-play") {
    return (
      <ProtectedDemoRoute>
        <BurgerRushMobileExperience />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/nexapath-play") {
    return (
      <ProtectedDemoRoute>
        <NexaPathMobileExperience />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/domi-play") {
    return (
      <ProtectedDemoRoute>
        <DomiMobileExperience />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/transactional") {
    return (
      <ProtectedDemoRoute>
        <AppCommerce />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/tourbar-transactional") {
    return (
      <ProtectedDemoRoute>
        <AppCommerce tourBarMode />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/carryout") {
    return (
      <ProtectedDemoRoute>
        <BurgerRushMobileExperience />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/food-trio-mobile") {
    return (
      <ProtectedDemoRoute>
        <FoodTrioMobileExperience />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/food-trio") {
    return (
      <ProtectedDemoRoute>
        <FoodTrioMobileExperience />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/food-trio-desktop") {
    return (
      <ProtectedDemoRoute>
        <LaunchSelectorTourBar variant="foodTrioDesktop" />
      </ProtectedDemoRoute>
    );
  }


  if (path === "/carryout-legacy") {
    return (
      <ProtectedDemoRoute>
        <AppCarryout />
      </ProtectedDemoRoute>
    );
  }


  if (path === "/restaurant-new") {
    return (
      <ProtectedDemoRoute>
        <AppCustomerCarryout />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/restaurant") {
    return (
      <ProtectedDemoRoute>
        <AppCustomerCarryout />
      </ProtectedDemoRoute>
    );
  }


  if (path === "/informational-mobile-live") {
    return (
      <ProtectedDemoRoute>
        <SmartBarMobileOnRealInformationalSite />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/informational") {
    if (isLocalDemoAuthBypassEnabled()) {
      return <SmartBarMobileOnRealInformationalSite />;
    }

    return (
      <ProtectedDemoRoute>
        <App />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/smartbar-speed") {
    return (
      <ProtectedDemoRoute>
        <LaunchSelectorTourBar />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/smartbar-burgerrush") {
    return (
      <ProtectedDemoRoute>
        <LaunchSelectorTourBar variant="burgerRushOnly" />
      </ProtectedDemoRoute>
    );
  }

  if (path === "/local-speed-demo" || path === "/direct-speed-demo") {
    return <SmartBarSpeedDemo autoPlay variant="full" />;
  }

  if (path === "/local-smartbar-finale" || path === "/local-finale-demo") {
    return <SmartBarMobileFinaleExperience autoPlay />;
  }

  if (path === "/local-smartbar-domi" || path === "/local-domi-demo") {
    return <DomiMobileExperience demoFixtureMode autoPlay />;
  }

  if (path === "/local-food-trio-demo" || path === "/food-trio-demo") {
    return <FoodTrioMobileExperience />;
  }

  if (path === "/local-food-trio-desktop-demo" || path === "/food-trio-desktop-demo") {
    return <SmartBarSpeedDemo autoPlay variant="foodTrioDesktop" />;
  }


  if (isSmartBarHostname()) {
    const smartBarVariant = smartBarSpeedVariantFromPath(path);

    return <LaunchSelectorTourBar variant={smartBarVariant} />;
  }

  if (path === "/") {
    return <LaunchSelector />;
  }

  return <LaunchSelector />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);

