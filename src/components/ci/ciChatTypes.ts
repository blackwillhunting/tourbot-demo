import type { ReactNode } from "react";

export type ApexShellState = "welcome" | "panel" | "launcher";

export type ApexQuickStart = {
  label: string;
  prompt: string;
};

export type ApexAction = {
  label: string;
  prompt: string;
};

export type ApexEvidenceCard = {
  eyebrow?: string;
  title: string;
  body: string;
  meta?: string;
};

export type ApexFixtureReply = {
  title: string;
  body: string;
  cards?: ApexEvidenceCard[];
  actions?: ApexAction[];
};

export type ApexThreadItem = {
  id: string;
  role: "user" | "bot";
  title?: string;
  body: string;
  cards?: ApexEvidenceCard[];
  actions?: ApexAction[];
  status?: "thinking" | "done";
};

export type ApexChatShellProps = {
  title?: string;
  subtitle?: string;
  greeting?: string;
  placeholder?: string;
  quickStarts?: ApexQuickStart[];
  initialShellState?: ApexShellState;
  className?: string;
  inline?: boolean;
  rightRail?: ReactNode;
};
