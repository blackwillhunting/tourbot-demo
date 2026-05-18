export type CarryoutQualifierOption = {
  label?: string | null;
  value?: string | null;
  qualifierId?: string | null;
  itemId?: string | null;
  lineItemId?: string | null;
  targetId?: string | null;
  selected?: boolean;
  state?: "selected" | "available" | "missing" | string;
  priceDelta?: number | null;
};

export type CarryoutQualifierGroup = {
  kind?: "qualifier" | string;
  qualifierId?: string | null;
  label?: string | null;
  itemId?: string | null;
  lineItemId?: string | null;
  targetId?: string | null;
  required?: boolean;
  missing?: boolean;
  selectedValue?: string | null;
  selectedLabel?: string | null;
  options?: CarryoutQualifierOption[];
};

export type CarryoutSelectedQualifier = {
  qualifierId?: string | null;
  label?: string | null;
  value?: string | null;
  valueLabel?: string | null;
  targetId?: string | null;
};

export type CarryoutMissingQualifier = {
  qualifierId?: string | null;
  label?: string | null;
  targetId?: string | null;
};

export type CarryoutPreCartLine = {
  id?: string | null;
  itemId?: string | null;
  lineItemId?: string | null;
  type?: "offer" | "bundle" | string;
  title?: string | null;
  targetId?: string | null;
  quantity?: number | null;
  knownSelections?: string[];
  qualifiers?: CarryoutSelectedQualifier[];
  modifiers?: Array<{ label?: string | null; priceDelta?: number | null }>;
  upgrades?: Array<{ label?: string | null; priceDelta?: number | null }>;
  missingQualifiers?: CarryoutMissingQualifier[];
  qualifierGroups?: CarryoutQualifierGroup[];
  lineSubtotal?: number | null;
  priceStatus?: string | null;
  status?: "ready" | "pending" | string;
};

export type CarryoutPreCartState = {
  type?: string;
  status?: string;
  nextAction?: string;
  completeItems?: CarryoutPreCartLine[];
  pendingItems?: CarryoutPreCartLine[];
  cannotMatchItems?: unknown[];
  currentQualifierControls?: CarryoutQualifierGroup[];
  savedBadgeCount?: number;
  navigationOrder?: string[];
  totals?: {
    status?: string;
    subtotal?: number | null;
    estimatedTax?: number | null;
    estimatedTotal?: number | null;
    finalTotalAvailable?: boolean;
    currency?: string | null;
  };
};
