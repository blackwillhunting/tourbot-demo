export type SmartBarMobileConditionalNavigationDecisionInput = {
  currentGroupId: string;
  resolverGroupId?: string | null;
  conditionalHomeGroupId?: string | null;
  directChildGroupIds?: string[];
  activeGroupIds?: string[];
  selected: boolean;
  currentGroupSelectionMode?: "single" | "multi";
  currentGroupNeedsRequiredChoice: boolean;
  currentGroupIsConditionalHome: boolean;
};

export type SmartBarMobileConditionalNavigationDecision = {
  visibleGroupId: string;
  conditionalHomeGroupId: string | null;
};

/**
 * Chooses only the panel that should remain visible after one option click.
 *
 * Cart status and backend repricing are intentionally not inputs. They may
 * update selections and prices, but they are not navigation commands.
 */
export function smartBarMobileConditionalNavigationTarget({
  currentGroupId,
  resolverGroupId = null,
  conditionalHomeGroupId = null,
  directChildGroupIds = [],
  activeGroupIds = [],
  selected,
  currentGroupSelectionMode = "single",
  currentGroupNeedsRequiredChoice,
  currentGroupIsConditionalHome,
}: SmartBarMobileConditionalNavigationDecisionInput): SmartBarMobileConditionalNavigationDecision {
  const activeIds = new Set(activeGroupIds.filter(Boolean));
  const resolvedHomeGroupId = conditionalHomeGroupId || (
    currentGroupIsConditionalHome ? currentGroupId : null
  );
  const firstActiveDirectChildId = selected
    ? directChildGroupIds.find((groupId) => activeIds.has(groupId)) || null
    : null;

  if (firstActiveDirectChildId) {
    return {
      visibleGroupId: firstActiveDirectChildId,
      conditionalHomeGroupId: resolvedHomeGroupId,
    };
  }

  const insideConditionalBranch = Boolean(
    resolvedHomeGroupId &&
    currentGroupId !== resolvedHomeGroupId
  );
  const shouldReturnHome = Boolean(
    insideConditionalBranch &&
    currentGroupSelectionMode !== "multi" &&
    !currentGroupNeedsRequiredChoice
  );

  if (resolvedHomeGroupId) {
    return {
      visibleGroupId: shouldReturnHome
        ? resolvedHomeGroupId
        : currentGroupId,
      conditionalHomeGroupId: resolvedHomeGroupId,
    };
  }

  return {
    visibleGroupId: resolverGroupId || currentGroupId,
    conditionalHomeGroupId: null,
  };
}
