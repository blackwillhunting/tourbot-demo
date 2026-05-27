import { useEffect, useState } from "react";

const FIXTURE_RECORDER_QUERY_PARAM = "recordFixtures";
const FIXTURE_RECORDER_ENABLED_KEY = "tourbot_fixture_recorder_enabled";
const FIXTURE_RECORDER_STORAGE_KEY = "tourbot_fixture_recordings";

export type GuideFixtureRecordSource = "live-api" | "existing-fixture";

export type GuideFixtureRecordInput = {
  source: GuideFixtureRecordSource;
  prompt: string;
  guideConfig?: unknown;
  request?: unknown;
  response: unknown;
};

type GuideFixtureRecord = GuideFixtureRecordInput & {
  id: string;
  recordedAt: string;
  url: string;
  path: string;
  search: string;
  normalizedPrompt: string;
  guideMode?: string;
  catalogMode?: string;
};

function normalizePrompt(value: string) {
  return (value || "")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9$.,'"?/%\-\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function guideConfigValue(guideConfig: unknown, key: string) {
  if (!guideConfig || typeof guideConfig !== "object") return undefined;
  const value = (guideConfig as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function safeReadRecords(): GuideFixtureRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(FIXTURE_RECORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteRecords(records: GuideFixtureRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FIXTURE_RECORDER_STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent("tourbot-fixture-recorder-updated"));
}

export function isGuideFixtureRecordingEnabled() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get(FIXTURE_RECORDER_QUERY_PARAM);

  if (queryValue === "1" || queryValue === "true") {
    window.localStorage.setItem(FIXTURE_RECORDER_ENABLED_KEY, "1");
    return true;
  }

  if (queryValue === "0" || queryValue === "false") {
    window.localStorage.removeItem(FIXTURE_RECORDER_ENABLED_KEY);
    return false;
  }

  return window.localStorage.getItem(FIXTURE_RECORDER_ENABLED_KEY) === "1";
}

export function recordGuideFixture(input: GuideFixtureRecordInput) {
  if (!isGuideFixtureRecordingEnabled()) return;
  if (typeof window === "undefined") return;

  const now = new Date();
  const guideMode = guideConfigValue(input.guideConfig, "mode");
  const catalogMode = guideConfigValue(input.guideConfig, "catalogMode");
  const record: GuideFixtureRecord = {
    ...input,
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
    recordedAt: now.toISOString(),
    url: window.location.href,
    path: window.location.pathname,
    search: window.location.search,
    normalizedPrompt: normalizePrompt(input.prompt),
    guideMode,
    catalogMode,
  };

  const records = safeReadRecords();
  records.push(record);
  safeWriteRecords(records);
}

export function exportGuideFixtureRecords() {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      records: safeReadRecords(),
    },
    null,
    2,
  );
}

export function clearGuideFixtureRecords() {
  safeWriteRecords([]);
}

function downloadFixtureRecords() {
  const json = exportGuideFixtureRecords();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tourbot-guide-fixtures-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function installConsoleHelpers() {
  if (typeof window === "undefined") return;

  (window as typeof window & {
    tourbotFixtureRecorder?: {
      records: () => GuideFixtureRecord[];
      exportJson: () => string;
      clear: () => void;
    };
  }).tourbotFixtureRecorder = {
    records: safeReadRecords,
    exportJson: exportGuideFixtureRecords,
    clear: clearGuideFixtureRecords,
  };
}

export function GuideFixtureRecorderControls() {
  const [enabled, setEnabled] = useState(false);
  const [count, setCount] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    installConsoleHelpers();

    const refresh = () => {
      setEnabled(isGuideFixtureRecordingEnabled());
      setCount(safeReadRecords().length);
    };

    refresh();
    window.addEventListener("tourbot-fixture-recorder-updated", refresh as EventListener);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("tourbot-fixture-recorder-updated", refresh as EventListener);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!enabled) return null;

  const copyFixtures = async () => {
    setCopyStatus("idle");
    try {
      await navigator.clipboard.writeText(exportGuideFixtureRecords());
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      setCopyStatus("failed");
      downloadFixtureRecords();
    }
  };

  const clearFixtures = () => {
    clearGuideFixtureRecords();
    setCopyStatus("idle");
  };

  return (
    <div className="fixed left-3 top-3 z-[10000] max-w-[calc(100vw-24px)] rounded-2xl border border-amber-200 bg-amber-50/95 p-3 text-xs text-amber-950 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-bold">Fixture recorder</div>
          <div className="mt-0.5 text-amber-800">{count} captured response{count === 1 ? "" : "s"}</div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={copyFixtures}
            className="rounded-full bg-amber-900 px-2.5 py-1 font-semibold text-white hover:bg-amber-800"
          >
            {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Downloaded" : "Copy"}
          </button>
          <button
            type="button"
            onClick={downloadFixtureRecords}
            className="rounded-full bg-white px-2.5 py-1 font-semibold text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100"
          >
            Download
          </button>
          <button
            type="button"
            onClick={clearFixtures}
            className="rounded-full bg-white px-2.5 py-1 font-semibold text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
