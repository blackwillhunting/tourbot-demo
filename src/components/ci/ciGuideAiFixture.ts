type GuideAiFixtureRequest = {
  message?: string;
  conversationContext?: {
    recentUserMessages?: string[];
    lastUserMessage?: string;
  };
};

type FixtureReply = {
  title: string;
  answer: string;
  answerParts?: {
    intro?: string;
    bullets?: string[];
    closing?: string;
  };
  refinementChips?: string[];
  rankedDestinations?: unknown[];
  stepNarratives?: unknown[];
  visibleContext?: Record<string, unknown>;
};

type ServiceNowKind =
  | "incident"
  | "request"
  | "change"
  | "task"
  | "problem"
  | "approval";

type ServiceNowRecord = {
  id: string;
  kind: ServiceNowKind;
  label: string;
  shortDescription: string;
  state: string;
  priority: "P1" | "P2" | "P3" | "P4";
  assignmentGroup: string;
  assignedTo: string;
  openedBy: string;
  updatedAgo: string;
  dueLabel?: string;
  watchItem: string;
  latestUpdate: string;
  updates: string[];
};

const STORAGE_KEY = "apex_servicenow_fixture_records_v2";

const BASE_RECORDS: ServiceNowRecord[] = [
  {
    id: "INC001024",
    kind: "incident",
    label: "Incident",
    shortDescription: "VPN login failures affecting Finance",
    state: "In Progress",
    priority: "P2",
    assignmentGroup: "Network Operations",
    assignedTo: "Avery Johnson",
    openedBy: "Chris Chapman",
    updatedAgo: "38 minutes ago",
    dueLabel: "SLA risk in 9h",
    watchItem: "Needs affected-user count and one fresh error screenshot.",
    latestUpdate:
      "Network Operations reproduced the failure on the finance VPN profile and opened a vendor case.",
    updates: [
      "Vendor case opened with packet capture attached.",
      "Finance users can temporarily authenticate through the backup VPN profile.",
    ],
  },
  {
    id: "REQ001337",
    kind: "request",
    label: "Request",
    shortDescription: "New laptop setup for analyst onboarding",
    state: "Waiting Approval",
    priority: "P3",
    assignmentGroup: "Desktop Support",
    assignedTo: "Jordan Lee",
    openedBy: "Chris Chapman",
    updatedAgo: "2 hours ago",
    dueLabel: "Needed before Monday onboarding",
    watchItem: "Waiting on manager approval for hardware release.",
    latestUpdate:
      "Desktop Support staged the standard build, but the asset cannot ship until manager approval lands.",
    updates: [
      "Standard analyst image selected.",
      "Docking station added to fulfillment bundle.",
    ],
  },
  {
    id: "CHG000481",
    kind: "change",
    label: "Change",
    shortDescription: "Saturday firewall rule update for vendor SFTP",
    state: "Scheduled",
    priority: "P3",
    assignmentGroup: "Infrastructure Change",
    assignedTo: "Priya Raman",
    openedBy: "Chris Chapman",
    updatedAgo: "Yesterday",
    dueLabel: "Change window: Sat 10:00 PM–11:30 PM",
    watchItem: "CAB approval is complete; implementation notes still need final validation.",
    latestUpdate:
      "Change moved to Scheduled after CAB approval. Backout plan is attached in the staged record.",
    updates: [
      "CAB approved the implementation window.",
      "Firewall owner confirmed no overlapping maintenance.",
    ],
  },
  {
    id: "TASK000778",
    kind: "task",
    label: "Task",
    shortDescription: "Validate ServiceNow assignment rules for Finance queue",
    state: "Open",
    priority: "P3",
    assignmentGroup: "Platform Operations",
    assignedTo: "Chris Chapman",
    openedBy: "Maya Patel",
    updatedAgo: "3 days ago",
    dueLabel: "Due tomorrow",
    watchItem: "Needs test assignment for incident, request, and change paths.",
    latestUpdate:
      "Rule update was deployed to the staging instance. Final validation is still pending.",
    updates: [
      "Finance queue mapping added to staging.",
      "Regression checklist is ready for owner review.",
    ],
  },
  {
    id: "PRB000044",
    kind: "problem",
    label: "Problem",
    shortDescription: "Recurring Teams call quality degradation",
    state: "Root Cause Analysis",
    priority: "P3",
    assignmentGroup: "Collaboration Services",
    assignedTo: "Morgan Smith",
    openedBy: "Chris Chapman",
    updatedAgo: "5 days ago",
    dueLabel: "Stale",
    watchItem: "No owner update in five days; likely needs a nudge.",
    latestUpdate:
      "Packet loss appears concentrated on one office subnet, but root cause has not been confirmed.",
    updates: [
      "Three related incidents linked to the problem record.",
      "Network telemetry review is still open.",
    ],
  },
];

const KIND_LABELS: Record<ServiceNowKind, string> = {
  incident: "Incident",
  request: "Request",
  change: "Change",
  task: "Task",
  problem: "Problem",
  approval: "Approval",
};

const PREFIX_BY_KIND: Record<ServiceNowKind, string> = {
  incident: "INC",
  request: "REQ",
  change: "CHG",
  task: "TASK",
  problem: "PRB",
  approval: "APR",
};

const DEFAULT_GROUP_BY_KIND: Record<ServiceNowKind, string> = {
  incident: "Service Desk",
  request: "Fulfillment Operations",
  change: "Infrastructure Change",
  task: "Platform Operations",
  problem: "Problem Management",
  approval: "Approvals",
};

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9:_\-.\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function readRecords(): ServiceNowRecord[] {
  if (!canUseStorage()) return BASE_RECORDS;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(BASE_RECORDS));
      return BASE_RECORDS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return BASE_RECORDS;
    return parsed;
  } catch {
    return BASE_RECORDS;
  }
}

function saveRecords(records: ServiceNowRecord[]) {
  if (!canUseStorage()) return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage failures in private/incognito contexts.
  }
}

function nextRecordId(kind: ServiceNowKind, records: ServiceNowRecord[]) {
  const prefix = PREFIX_BY_KIND[kind];
  const currentMax = records.reduce((max, record) => {
    if (!record.id.startsWith(prefix)) return max;
    const numeric = Number(record.id.replace(/\D/g, ""));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, kind === "change" ? 481 : kind === "incident" ? 1024 : kind === "request" ? 1337 : kind === "task" ? 778 : 44);

  return `${prefix}${String(currentMax + 1).padStart(6, "0")}`;
}

function kindFromPrompt(message: string): ServiceNowKind {
  const text = normalize(message);
  if (text.includes("change") || text.includes("chg") || text.includes("firewall") || text.includes("release")) return "change";
  if (text.includes("problem") || text.includes("root cause") || text.includes("recurring")) return "problem";
  if (text.includes("approval") || text.includes("approve")) return "approval";
  if (text.includes("task") || text.includes("to do") || text.includes("todo")) return "task";
  if (text.includes("request") || text.includes("req") || text.includes("ritm") || text.includes("access") || text.includes("laptop")) return "request";
  return "incident";
}

function priorityFromPrompt(message: string): "P1" | "P2" | "P3" | "P4" {
  const text = normalize(message);
  if (text.includes("outage") || text.includes("all users") || text.includes("sev1") || text.includes("p1")) return "P1";
  if (text.includes("finance") || text.includes("many users") || text.includes("urgent") || text.includes("p2")) return "P2";
  if (text.includes("low") || text.includes("p4")) return "P4";
  return "P3";
}

function stateForKind(kind: ServiceNowKind) {
  switch (kind) {
    case "change":
      return "Assess";
    case "request":
      return "Submitted";
    case "approval":
      return "Requested";
    case "problem":
      return "New";
    case "task":
      return "Open";
    default:
      return "New";
  }
}

function cleanShortDescription(message: string, kind: ServiceNowKind) {
  const stripped = message
    .replace(/^\s*(please\s+)?(can you\s+)?(create|open|raise|submit|log|make)\s+(a|an)?\s*/i, "")
    .replace(/^(incident|request|change|task|problem|approval)\s*(for|to|about)?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (stripped.length > 8) {
    return stripped.charAt(0).toUpperCase() + stripped.slice(1).replace(/[.?!]+$/, "");
  }

  switch (kind) {
    case "change":
      return "Planned infrastructure change";
    case "request":
      return "New service request";
    case "task":
      return "Follow-up task";
    case "problem":
      return "Recurring service issue";
    case "approval":
      return "Approval request";
    default:
      return "New service incident";
  }
}

function assignmentGroupFor(message: string, kind: ServiceNowKind) {
  const text = normalize(message);
  if (text.includes("vpn") || text.includes("network") || text.includes("firewall")) return "Network Operations";
  if (text.includes("laptop") || text.includes("desktop") || text.includes("device")) return "Desktop Support";
  if (text.includes("identity") || text.includes("access") || text.includes("login") || text.includes("sso")) return "Identity Operations";
  if (text.includes("teams") || text.includes("sharepoint") || text.includes("m365")) return "Collaboration Services";
  if (text.includes("servicenow") || text.includes("assignment")) return "Platform Operations";
  return DEFAULT_GROUP_BY_KIND[kind];
}

function formatRecordLine(record: ServiceNowRecord) {
  return `**${record.id} — ${record.shortDescription}** — ${record.label} · ${record.priority} · ${record.state} · ${record.assignmentGroup}`;
}

function actionChips(...chips: string[]) {
  return chips.filter(Boolean).slice(0, 3);
}

function reply({
  title,
  intro,
  bullets = [],
  closing = "",
  chips = [],
  visibleContext = {},
}: {
  title: string;
  intro: string;
  bullets?: string[];
  closing?: string;
  chips?: string[];
  visibleContext?: Record<string, unknown>;
}): FixtureReply {
  const answer = [
    intro,
    bullets.length ? bullets.map((item) => `- ${item}`).join("\n") : "",
    closing,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    title,
    answer,
    answerParts: { intro, bullets, closing },
    refinementChips: actionChips(...chips),
    rankedDestinations: [],
    stepNarratives: [],
    visibleContext: {
      ciFixtureMode: true,
      fixtureSystem: "servicenow",
      lastResolvedAt: new Date().toISOString(),
      ...visibleContext,
    },
  };
}

function createRecord(message: string) {
  const records = readRecords();
  const kind = kindFromPrompt(message);
  const record: ServiceNowRecord = {
    id: nextRecordId(kind, records),
    kind,
    label: KIND_LABELS[kind],
    shortDescription: cleanShortDescription(message, kind),
    state: stateForKind(kind),
    priority: priorityFromPrompt(message),
    assignmentGroup: assignmentGroupFor(message, kind),
    assignedTo: "Triage queue",
    openedBy: "Chris Chapman",
    updatedAgo: "Just now",
    dueLabel: kind === "change" ? "Needs risk and implementation plan" : "Needs triage",
    watchItem:
      kind === "change"
        ? "Confirm risk, backout plan, implementation window, and approval path."
        : "Confirm impact, affected users, business service, and assignment group.",
    latestUpdate: "Record created by Apex from the Teams app viewport.",
    updates: ["Created from natural-language request in the Apex PoC."],
  };

  const updatedRecords = [record, ...records];
  saveRecords(updatedRecords);

  return reply({
    title: `${record.label} created`,
    intro: `Created staged ServiceNow **${record.label.toLowerCase()} ${record.id}**.`,
    bullets: [
      `**Short description:** ${record.shortDescription}`,
      `**State / priority:** ${record.state} · ${record.priority}`,
      `**Assignment:** ${record.assignmentGroup} · ${record.assignedTo}`,
      `**Opened by:** ${record.openedBy}`,
      `**Apex check:** ${record.watchItem}`,
    ],
    closing:
      "This is fixture mode, so nothing was sent to a live ServiceNow instance. For the CI pitch, it shows the intended creation flow and record shape.",
    chips: ["Show my records", `Update ${record.id}`, "Summarize active records"],
    visibleContext: {
      createdRecordId: record.id,
      createdRecordType: record.kind,
    },
  });
}

function findRecord(records: ServiceNowRecord[], id: string) {
  const cleanId = id.toUpperCase();
  return records.find((record) => record.id.toUpperCase() === cleanId);
}

function extractRecordId(message: string) {
  return (
    message.match(/\b(?:INC|REQ|RITM|CHG|TASK|PRB|APR)\d{5,8}\b/i)?.[0]?.toUpperCase() ||
    ""
  );
}

function extractUpdateNote(message: string, recordId: string) {
  const afterColon = message.match(/(?:with|note|add|says|update)\s*:?\s*(.+)$/i)?.[1]?.trim();
  if (afterColon && !afterColon.toUpperCase().startsWith(recordId)) return afterColon.replace(/[.]+$/, ".");

  const afterId = recordId
    ? message.slice(message.toUpperCase().indexOf(recordId) + recordId.length).trim()
    : "";
  const cleaned = afterId
    .replace(/^(with|note|add|says|to|:|-)\s*/i, "")
    .trim();

  return cleaned || "Follow-up added from Apex.";
}

function updateRecord(message: string) {
  const records = readRecords();
  const recordId = extractRecordId(message);

  if (!recordId) {
    return reply({
      title: "Record update needs an ID",
      intro: "I can update a staged ServiceNow record, but I need the record number.",
      bullets: [
        "Try **Update INC001024 with: vendor confirmed the outage is regional.**",
        "Or ask **Show my open ServiceNow records** to pick the record first.",
      ],
      closing: "In the production version, Apex would resolve this against your assigned records and ask before writing.",
      chips: ["Show my records", "Summarize updates", "Create incident"],
    });
  }

  const record = findRecord(records, recordId);

  if (!record) {
    return reply({
      title: "Record not found",
      intro: `I could not find **${recordId}** in the staged ServiceNow data.`,
      bullets: [
        "The fixture set may not include that number yet.",
        "Ask for **my open ServiceNow records** to see available records.",
      ],
      closing: "No live systems were queried.",
      chips: ["Show my records", "Create incident", "Summarize updates"],
    });
  }

  const note = extractUpdateNote(message, recordId);
  const nextRecord: ServiceNowRecord = {
    ...record,
    state: record.state === "New" ? "In Progress" : record.state,
    updatedAgo: "Just now",
    latestUpdate: note,
    updates: [note, ...record.updates],
  };

  const nextRecords = records.map((item) =>
    item.id.toUpperCase() === recordId ? nextRecord : item,
  );
  saveRecords(nextRecords);

  return reply({
    title: "Record updated",
    intro: `Added a staged update to **${nextRecord.id}**.`,
    bullets: [
      `**Record:** ${nextRecord.shortDescription}`,
      `**New work note:** ${note}`,
      `**State / priority:** ${nextRecord.state} · ${nextRecord.priority}`,
      `**Assigned group:** ${nextRecord.assignmentGroup}`,
    ],
    closing:
      "In live mode, Apex would write this as a ServiceNow work note or additional comment based on your permission and the selected update type.",
    chips: [`Summarize ${nextRecord.id}`, "Show my records", "Draft stakeholder update"],
    visibleContext: {
      updatedRecordId: nextRecord.id,
    },
  });
}

function listRecords(message: string) {
  const records = readRecords();
  const text = normalize(message);

  const filtered = records.filter((record) => {
    if (text.includes("incident")) return record.kind === "incident";
    if (text.includes("change")) return record.kind === "change";
    if (text.includes("request")) return record.kind === "request";
    if (text.includes("task")) return record.kind === "task";
    if (text.includes("problem")) return record.kind === "problem";
    return ["New", "Open", "In Progress", "Waiting Approval", "Scheduled", "Assess", "Root Cause Analysis", "Submitted"].includes(record.state);
  });

  const needsAction = filtered.filter((record) =>
    /approval|stale|needs|pending|waiting/i.test(`${record.state} ${record.dueLabel || ""} ${record.watchItem}`),
  );
  const moving = filtered.filter((record) => !needsAction.includes(record));

  return reply({
    title: "My ServiceNow records",
    intro: `I found **${filtered.length} open staged ServiceNow records** tied to your work queue.`,
    bullets: [
      needsAction.length
        ? `**Needs attention:** ${needsAction.map((record) => `${record.id} (${record.state})`).join(", ")}`
        : "**Needs attention:** none flagged in the fixture set.",
      ...filtered.slice(0, 6).map(formatRecordLine),
      moving.length
        ? `**Moving normally:** ${moving.map((record) => record.id).join(", ")}`
        : "**Moving normally:** no additional records outside the attention set.",
    ],
    closing:
      "The list is staged, but the behavior is the intended one: Apex finds your records, groups the work, and points you at the next action.",
    chips: ["Summarize updates", "Create incident", "Draft follow-up"],
    visibleContext: {
      listedRecordCount: filtered.length,
    },
  });
}

function summarizeRecords(message: string) {
  const records = readRecords();
  const recordId = extractRecordId(message);

  if (recordId) {
    const record = findRecord(records, recordId);
    if (!record) {
      return reply({
        title: "Record summary unavailable",
        intro: `I could not find **${recordId}** in the staged ServiceNow data.`,
        bullets: ["Ask for **my records** to see the available fixture records."],
        closing: "No live ServiceNow lookup was attempted.",
        chips: ["Show my records", "Create incident", "Summarize active records"],
      });
    }

    return reply({
      title: `${record.id} summary`,
      intro: `Here is the staged summary for **${record.id}**.`,
      bullets: [
        `**Record:** ${record.shortDescription}`,
        `**Current state:** ${record.state} · ${record.priority} · ${record.assignmentGroup}`,
        `**Latest update:** ${record.latestUpdate}`,
        `**Watch item:** ${record.watchItem}`,
        `**Recent notes:** ${record.updates.slice(0, 3).join(" / ")}`,
      ],
      closing:
        "Recommended next move: confirm the watch item or ask Apex to draft a stakeholder update.",
      chips: [`Update ${record.id}`, "Draft stakeholder update", "Show my records"],
    });
  }

  const stale = records.filter((record) => /stale|5 days|3 days/i.test(`${record.dueLabel || ""} ${record.updatedAgo}`));
  const waiting = records.filter((record) => /waiting|approval|needs|pending/i.test(`${record.state} ${record.watchItem} ${record.dueLabel || ""}`));
  const highPriority = records.filter((record) => ["P1", "P2"].includes(record.priority));

  return reply({
    title: "Active record summary",
    intro: "Here is the staged ServiceNow readout for your active records.",
    bullets: [
      `**Needs action:** ${waiting.length} records — ${waiting.map((record) => `${record.id}: ${record.watchItem}`).join(" ")}`,
      `**High priority:** ${highPriority.length} records — ${highPriority.map((record) => `${record.id} (${record.priority})`).join(", ")}`,
      stale.length
        ? `**Stale or quiet:** ${stale.map((record) => `${record.id} last updated ${record.updatedAgo}`).join(", ")}`
        : "**Stale or quiet:** none flagged.",
      `**Most important next move:** ${waiting[0]?.id || records[0]?.id} should be handled first because it is blocking the cleanest path to closure.`,
    ],
    closing:
      "This is the core pitch: Apex does not just chat. It reads the record set, summarizes the work, and tells the user where to act.",
    chips: ["Show my records", "Draft follow-up", "Create change"],
    visibleContext: {
      summarizedRecordCount: records.length,
    },
  });
}

function draftStakeholderUpdate() {
  const records = readRecords();
  const top = records[0] || BASE_RECORDS[0];

  return reply({
    title: "Draft stakeholder update",
    intro: "Here is a polished update drafted from the staged ServiceNow records:",
    bullets: [
      `**Current status:** ${top.id} is ${top.state.toLowerCase()} with ${top.assignmentGroup}; latest update is: ${top.latestUpdate}`,
      "**Action needed:** confirm the open watch item and keep the requester informed before the next checkpoint.",
      "**Suggested note:** We have the record triaged and the right group engaged. The remaining action is to confirm the pending dependency, then update the record with the next closure step.",
    ],
    closing:
      "In the live version, Apex could draft this into Teams, email, or a ServiceNow additional comment after user confirmation.",
    chips: [`Update ${top.id}`, "Show my records", "Summarize updates"],
  });
}

export function resolveCiGuideAiFixture(request: GuideAiFixtureRequest): FixtureReply {
  const message = request.message || "";
  const key = normalize(message);

  if (/\b(create|open|raise|submit|log|make)\b/.test(key)) {
    return createRecord(message);
  }

  if (/\bupdate\b/.test(key) && extractRecordId(message)) {
    return updateRecord(message);
  }

  if (
    key.includes("draft") ||
    key.includes("stakeholder") ||
    key.includes("follow up") ||
    key.includes("follow-up") ||
    key.includes("message")
  ) {
    return draftStakeholderUpdate();
  }

  if (
    key.includes("list") ||
    key.includes("show") ||
    key.includes("my records") ||
    key.includes("open records") ||
    key.includes("assigned to me") ||
    key.includes("waiting on")
  ) {
    return listRecords(message);
  }

  if (
    key.includes("summary") ||
    key.includes("summarize") ||
    key.includes("updates") ||
    key.includes("what changed") ||
    key.includes("needs attention") ||
    key.includes("active records")
  ) {
    return summarizeRecords(message);
  }

  if (/\bupdate\b/.test(key)) {
    return updateRecord(message);
  }

  return reply({
    title: "ServiceNow work agent",
    intro:
      "I’m running in staged ServiceNow fixture mode. I can create records, list your records, add updates, and summarize what needs attention.",
    bullets: [
      "Try **Create an incident for VPN login failures affecting the finance team.**",
      "Try **Show my open ServiceNow records.**",
      "Try **Update INC001024 with: vendor confirmed the outage is regional.**",
      "Try **Summarize updates on my active records.**",
    ],
    closing:
      "No live ServiceNow instance is connected yet. This PoC is designed to show the embedded Teams app workflow before CI grants real data access.",
    chips: ["Create incident", "Show my records", "Summarize updates"],
  });
}
