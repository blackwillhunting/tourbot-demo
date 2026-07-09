export type SmartBarVendorContext = {
  clientId: string;
  vendorId: string;
  displayName: string;
  demoPath: string;
  menuProfileId: string;
  behaviorProfileId: string;
  boardProfileId: string;
  timezone: string;
  onboardingStatus: string;
  isReadyForOrders: boolean;
  readyForOrdersUtc: string;
  readyBy: string;
  lastSmokeTestUtc: string;
  lastSmokeTestStatus: string;
  sandboxRequestStatus: string;
  sandboxRequestedUtc: string;
  sandboxStatus: string;
  websiteSetupRequestStatus: string;
  websiteSetupRequestedUtc: string;
  installStatus: string;
  installFinishedUtc: string;
  ghostTestStatus: string;
  ghostTestReadyUtc: string;
  websiteModeStatus: string;
  orderBoardEnabled: boolean;
  liveApprovedUtc: string;
  liveApprovedBy: string;
  subscriptionStatus: string;
  subscriptionActive: boolean;
  subscriptionPlan: string;
  subscriptionCurrentPeriodEnd: string;
  subscriptionCancelAtPeriodEnd: boolean;
  subscriptionUpdatedUtc: string;
  lastVendorAction: string;
  lastVendorActionUtc: string;
};

export const SMARTBAR_VENDOR_CONTEXT_STORAGE_KEY = "smartbar_vendor_context";

export const SMARTBAR_DEFAULT_VENDOR_CONTEXT: SmartBarVendorContext = Object.freeze({
  clientId: "burger-rush",
  vendorId: "burger-rush-main",
  displayName: "BurgerRush",
  demoPath: "/burger-rush",
  menuProfileId: "burger-rush-menu-v1",
  behaviorProfileId: "burger-rush-smartbar-v1",
  boardProfileId: "standard-order-board-v1",
  timezone: "America/New_York",
  onboardingStatus: "",
  isReadyForOrders: false,
  readyForOrdersUtc: "",
  readyBy: "",
  lastSmokeTestUtc: "",
  lastSmokeTestStatus: "",
  sandboxRequestStatus: "",
  sandboxRequestedUtc: "",
  sandboxStatus: "",
  websiteSetupRequestStatus: "",
  websiteSetupRequestedUtc: "",
  installStatus: "",
  installFinishedUtc: "",
  ghostTestStatus: "",
  ghostTestReadyUtc: "",
  websiteModeStatus: "",
  orderBoardEnabled: false,
  liveApprovedUtc: "",
  liveApprovedBy: "",
  subscriptionStatus: "",
  subscriptionActive: false,
  subscriptionPlan: "",
  subscriptionCurrentPeriodEnd: "",
  subscriptionCancelAtPeriodEnd: false,
  subscriptionUpdatedUtc: "",
  lastVendorAction: "",
  lastVendorActionUtc: "",
});

function smartBarVendorRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function smartBarVendorCleanString(value: unknown) {
  return String(value || "").trim();
}

function smartBarVendorPickString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = smartBarVendorCleanString(source[key]);
    if (value) return value;
  }

  const lowerKeyMap = new Map(Object.keys(source).map((key) => [key.toLowerCase(), key]));
  for (const key of keys) {
    const actualKey = lowerKeyMap.get(key.toLowerCase());
    if (!actualKey) continue;

    const value = smartBarVendorCleanString(source[actualKey]);
    if (value) return value;
  }

  return "";
}

function smartBarVendorPickBoolean(source: Record<string, unknown>, keys: string[], fallback = false) {
  const lowerKeyMap = new Map(Object.keys(source).map((key) => [key.toLowerCase(), key]));

  for (const key of keys) {
    const actualKey = Object.prototype.hasOwnProperty.call(source, key) ? key : lowerKeyMap.get(key.toLowerCase());
    if (!actualKey) continue;

    const value = source[actualKey];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const clean = value.trim().toLowerCase();
      if (["true", "1", "yes", "y", "ready"].includes(clean)) return true;
      if (["false", "0", "no", "n", ""].includes(clean)) return false;
    }
  }

  return fallback;
}

function smartBarVendorNormalizePath(value: unknown) {
  const path = smartBarVendorCleanString(value);
  if (!path || path.startsWith("http://") || path.startsWith("https://") || path.includes("\\")) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function normalizeSmartBarVendorContext(value?: unknown, demoPathFallback = ""): SmartBarVendorContext {
  const source = smartBarVendorRecord(value);
  const nested = smartBarVendorRecord(source.vendorContext);
  const merged = { ...source, ...nested };

  const clientId = smartBarVendorPickString(merged, ["clientId", "client_id", "ClientId", "ClientID"]) || SMARTBAR_DEFAULT_VENDOR_CONTEXT.clientId;
  const vendorId = smartBarVendorPickString(merged, ["vendorId", "vendor_id", "VendorId", "VendorID"]) || `${clientId}-main`;
  const displayName = smartBarVendorPickString(merged, ["displayName", "display_name", "clientName", "client_name", "name", "label", "DisplayName", "ClientName"]) || SMARTBAR_DEFAULT_VENDOR_CONTEXT.displayName;
  const demoPath = smartBarVendorNormalizePath(smartBarVendorPickString(merged, ["demoPath", "demo_path", "DemoPath", "route", "path"])) || smartBarVendorNormalizePath(demoPathFallback) || SMARTBAR_DEFAULT_VENDOR_CONTEXT.demoPath;
  const menuProfileId = smartBarVendorPickString(merged, ["menuProfileId", "menu_profile_id", "MenuProfileId"]) || `${clientId}-menu-v1`;
  const behaviorProfileId = smartBarVendorPickString(merged, ["behaviorProfileId", "behavior_profile_id", "BehaviorProfileId"]) || `${clientId}-smartbar-v1`;
  const boardProfileId = smartBarVendorPickString(merged, ["boardProfileId", "board_profile_id", "BoardProfileId"]) || SMARTBAR_DEFAULT_VENDOR_CONTEXT.boardProfileId;
  const timezone = smartBarVendorPickString(merged, ["timezone", "timeZone", "time_zone", "Timezone", "TimeZone"]) || SMARTBAR_DEFAULT_VENDOR_CONTEXT.timezone;
  const onboardingStatus = smartBarVendorPickString(merged, ["onboardingStatus", "onboarding_status", "OnboardingStatus"]);
  const isReadyForOrders = smartBarVendorPickBoolean(merged, ["isReadyForOrders", "is_ready_for_orders", "readyForOrders", "ReadyForOrders", "IsReadyForOrders"]);
  const readyForOrdersUtc = smartBarVendorPickString(merged, ["readyForOrdersUtc", "ready_for_orders_utc", "ReadyForOrdersUtc"]);
  const readyBy = smartBarVendorPickString(merged, ["readyBy", "ready_by", "ReadyBy"]);
  const lastSmokeTestUtc = smartBarVendorPickString(merged, ["lastSmokeTestUtc", "last_smoke_test_utc", "LastSmokeTestUtc"]);
  const lastSmokeTestStatus = smartBarVendorPickString(merged, ["lastSmokeTestStatus", "last_smoke_test_status", "LastSmokeTestStatus"]);
  const sandboxRequestStatus = smartBarVendorPickString(merged, ["sandboxRequestStatus", "sandbox_request_status", "SandboxRequestStatus"]);
  const sandboxRequestedUtc = smartBarVendorPickString(merged, ["sandboxRequestedUtc", "sandbox_requested_utc", "SandboxRequestedUtc"]);
  const sandboxStatus = smartBarVendorPickString(merged, ["sandboxStatus", "sandbox_status", "SandboxStatus"]);
  const websiteSetupRequestStatus = smartBarVendorPickString(merged, ["websiteSetupRequestStatus", "website_setup_request_status", "WebsiteSetupRequestStatus"]);
  const websiteSetupRequestedUtc = smartBarVendorPickString(merged, ["websiteSetupRequestedUtc", "website_setup_requested_utc", "WebsiteSetupRequestedUtc"]);
  const installStatus = smartBarVendorPickString(merged, ["installStatus", "install_status", "InstallStatus"]);
  const installFinishedUtc = smartBarVendorPickString(merged, ["installFinishedUtc", "install_finished_utc", "InstallFinishedUtc"]);
  const ghostTestStatus = smartBarVendorPickString(merged, ["ghostTestStatus", "ghost_test_status", "GhostTestStatus"]);
  const ghostTestReadyUtc = smartBarVendorPickString(merged, ["ghostTestReadyUtc", "ghost_test_ready_utc", "GhostTestReadyUtc"]);
  const websiteModeStatus = smartBarVendorPickString(merged, ["websiteModeStatus", "website_mode_status", "WebsiteModeStatus"]);
  const orderBoardEnabled = smartBarVendorPickBoolean(merged, ["orderBoardEnabled", "order_board_enabled", "OrderBoardEnabled"]);
  const liveApprovedUtc = smartBarVendorPickString(merged, ["liveApprovedUtc", "live_approved_utc", "LiveApprovedUtc"]);
  const liveApprovedBy = smartBarVendorPickString(merged, ["liveApprovedBy", "live_approved_by", "LiveApprovedBy"]);
  const subscriptionStatus = smartBarVendorPickString(merged, ["subscriptionStatus", "subscription_status", "SubscriptionStatus"]);
  const subscriptionActive = smartBarVendorPickBoolean(merged, ["subscriptionActive", "subscription_active", "SubscriptionActive"]);
  const subscriptionPlan = smartBarVendorPickString(merged, ["subscriptionPlan", "subscription_plan", "SubscriptionPlan"]);
  const subscriptionCurrentPeriodEnd = smartBarVendorPickString(merged, ["subscriptionCurrentPeriodEnd", "subscription_current_period_end", "SubscriptionCurrentPeriodEnd"]);
  const subscriptionCancelAtPeriodEnd = smartBarVendorPickBoolean(merged, ["subscriptionCancelAtPeriodEnd", "subscription_cancel_at_period_end", "SubscriptionCancelAtPeriodEnd"]);
  const subscriptionUpdatedUtc = smartBarVendorPickString(merged, ["subscriptionUpdatedUtc", "subscription_updated_utc", "SubscriptionUpdatedUtc"]);
  const lastVendorAction = smartBarVendorPickString(merged, ["lastVendorAction", "last_vendor_action", "LastVendorAction"]);
  const lastVendorActionUtc = smartBarVendorPickString(merged, ["lastVendorActionUtc", "last_vendor_action_utc", "LastVendorActionUtc"]);

  return {
    clientId,
    vendorId,
    displayName,
    demoPath,
    menuProfileId,
    behaviorProfileId,
    boardProfileId,
    timezone,
    onboardingStatus,
    isReadyForOrders,
    readyForOrdersUtc,
    readyBy,
    lastSmokeTestUtc,
    lastSmokeTestStatus,
    sandboxRequestStatus,
    sandboxRequestedUtc,
    sandboxStatus,
    websiteSetupRequestStatus,
    websiteSetupRequestedUtc,
    installStatus,
    installFinishedUtc,
    ghostTestStatus,
    ghostTestReadyUtc,
    websiteModeStatus,
    orderBoardEnabled,
    liveApprovedUtc,
    liveApprovedBy,
    subscriptionStatus,
    subscriptionActive,
    subscriptionPlan,
    subscriptionCurrentPeriodEnd,
    subscriptionCancelAtPeriodEnd,
    subscriptionUpdatedUtc,
    lastVendorAction,
    lastVendorActionUtc,
  };
}

export function smartBarVendorContextFromAuthPayload(payload?: unknown, demoPathFallback = "") {
  return normalizeSmartBarVendorContext(payload, demoPathFallback);
}

export function getStoredSmartBarVendorContext() {
  if (typeof window === "undefined") return SMARTBAR_DEFAULT_VENDOR_CONTEXT;

  const raw = window.localStorage.getItem(SMARTBAR_VENDOR_CONTEXT_STORAGE_KEY);
  if (!raw) return SMARTBAR_DEFAULT_VENDOR_CONTEXT;

  try {
    return normalizeSmartBarVendorContext(JSON.parse(raw));
  } catch {
    return SMARTBAR_DEFAULT_VENDOR_CONTEXT;
  }
}

export function saveStoredSmartBarVendorContext(value?: unknown, demoPathFallback = "") {
  if (typeof window === "undefined") return;

  const vendorContext = normalizeSmartBarVendorContext(value, demoPathFallback);
  window.localStorage.setItem(SMARTBAR_VENDOR_CONTEXT_STORAGE_KEY, JSON.stringify(vendorContext));
}

export function clearStoredSmartBarVendorContext() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SMARTBAR_VENDOR_CONTEXT_STORAGE_KEY);
}
