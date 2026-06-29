import type { ApexFixtureReply, ApexQuickStart } from "./ciChatTypes";

export const CI_QUICK_STARTS: ApexQuickStart[] = [
  {
    label: "Create incident",
    prompt:
      "Create an incident for VPN login failures affecting the finance team.",
  },
  {
    label: "My records",
    prompt: "Show my open ServiceNow records.",
  },
  {
    label: "Summarize updates",
    prompt: "Summarize updates on my active records.",
  },
  {
    label: "Update record",
    prompt: "Update INC001024 with: vendor confirmed the outage is regional.",
  },
];

const serviceNowCards = [
  {
    eyebrow: "ServiceNow · INC001024",
    title: "VPN login failures affecting Finance",
    body:
      "Priority P2 incident owned by Network Operations. Latest update: vendor case opened; affected-user count still needed.",
    meta: "State: In Progress · SLA risk in 9h",
  },
  {
    eyebrow: "ServiceNow · REQ001337",
    title: "New laptop setup for analyst onboarding",
    body:
      "Request is staged by Desktop Support and waiting on manager approval before hardware release.",
    meta: "State: Waiting Approval · Needed before Monday",
  },
  {
    eyebrow: "ServiceNow · CHG000481",
    title: "Saturday firewall rule update",
    body:
      "Change is scheduled after CAB approval. Implementation notes and backout plan are ready for final validation.",
    meta: "State: Scheduled · Window: Sat 10:00 PM",
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function resolveCiFixtureReply(prompt: string): ApexFixtureReply {
  const text = normalize(prompt);

  if (text.includes("create") || text.includes("incident") || text.includes("request") || text.includes("change")) {
    return {
      title: "ServiceNow record created",
      body:
        "Created staged Incident INC001025. Short description: VPN login failures affecting Finance. State: New. Priority: P2. Assignment group: Network Operations. Apex flagged the next required details: impact count, screenshots, and business service.",
      cards: serviceNowCards.slice(0, 1),
      actions: [
        { label: "Show my records", prompt: "Show my open ServiceNow records." },
        { label: "Summarize updates", prompt: "Summarize updates on my active records." },
      ],
    };
  }

  if (text.includes("list") || text.includes("show") || text.includes("records")) {
    return {
      title: "My ServiceNow records",
      body:
        "I found five open staged records: two need attention, two are moving normally, and one is stale. The most important next action is INC001024 because it has priority and SLA exposure.",
      cards: serviceNowCards,
      actions: [
        { label: "Summarize updates", prompt: "Summarize updates on my active records." },
        { label: "Update INC001024", prompt: "Update INC001024 with: vendor confirmed the outage is regional." },
      ],
    };
  }

  if (text.includes("update") || text.includes("summarize") || text.includes("summary")) {
    return {
      title: "Active record summary",
      body:
        "Your active ServiceNow records need three things: INC001024 needs impact detail, REQ001337 needs manager approval, and PRB000044 needs an owner nudge because it has been quiet for five days.",
      cards: serviceNowCards,
      actions: [
        { label: "Draft follow-up", prompt: "Draft a stakeholder update from these records." },
        { label: "Show my records", prompt: "Show my open ServiceNow records." },
      ],
    };
  }

  return {
    title: "ServiceNow work agent",
    body:
      "I can work against staged ServiceNow records in this PoC: create a record, list your records, add updates, or summarize what needs attention.",
    cards: serviceNowCards,
    actions: CI_QUICK_STARTS.slice(0, 3).map((item) => ({
      label: item.label,
      prompt: item.prompt,
    })),
  };
}
