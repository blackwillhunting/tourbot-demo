import React, { useEffect, useState, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppCommerce from "./App-Commerce";
import AppCarryout from "./App-Carryout";
import AppCustomerCarryout from "./App-CustomerCarryout";
import LaunchSelector from "./LaunchSelector";
import LaunchSelectorTourBar from "./LaunchSelector_TourBar";
import "./index.css";

const TOURBOT_AUTH_SESSION_URL = "/api/tourbot-auth/session";
const TOURBOT_AUTH_TOKEN_KEY = "tourbot_demo_token";
const TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY = "tourbot_demo_token_expires_at";

function normalizedPath() {
  return window.location.pathname.replace(/\/$/, "") || "/";
}

function currentReturnTo() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function clearStoredTourBotDemoToken() {
  window.localStorage.removeItem(TOURBOT_AUTH_TOKEN_KEY);
  window.localStorage.removeItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY);
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
  return (
    import.meta.env.DEV &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
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
  const [isAllowed, setIsAllowed] = useState(() => isLocalDemoAuthBypassEnabled());

  useEffect(() => {
    if (isLocalDemoAuthBypassEnabled()) {
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

function Router() {
  const path = normalizedPath();

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
        <AppCarryout />
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

  if (path === "/informational") {
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
