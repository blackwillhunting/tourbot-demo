export type SmartBarPlaygroundPricingLine = {
  id?: string;
  cartLineKey?: string;
  sourceLineItemId?: string;
  price?: string;
  [key: string]: unknown;
};

function smartBarPlaygroundDurableLineKey(line: SmartBarPlaygroundPricingLine) {
  return String(
    line.sourceLineItemId ||
    line.cartLineKey ||
    line.id ||
    "",
  ).trim();
}

/**
 * Restaurant-calculated profiles have no client-visible price to refresh.
 * Their exact local option mutation is authoritative and must not be sent
 * through a whole-cart AI review.
 */
export function smartBarPlaygroundShouldRequestChoiceRefresh(pricingMode: string) {
  return String(pricingMode || "").trim().toLowerCase() !== "restaurant-calculated";
}

/**
 * A legacy exact-pricing refresh may contribute only the matching line's
 * display price. It may not replace status, selections, details, group state,
 * identity, or any other cart semantics.
 */
export function smartBarPlaygroundApplyPricingOnly<T extends SmartBarPlaygroundPricingLine>(
  currentLines: T[],
  refreshedLines: SmartBarPlaygroundPricingLine[],
): T[] {
  const refreshedByKey = new Map<string, SmartBarPlaygroundPricingLine[]>();

  refreshedLines.forEach((line) => {
    const key = smartBarPlaygroundDurableLineKey(line);
    if (!key) return;
    const existing = refreshedByKey.get(key) || [];
    existing.push(line);
    refreshedByKey.set(key, existing);
  });

  return currentLines.map((line) => {
    const key = smartBarPlaygroundDurableLineKey(line);
    if (!key) return line;

    const matches = refreshedByKey.get(key) || [];
    if (matches.length !== 1) return line;

    const refreshedPrice = matches[0].price;
    if (typeof refreshedPrice !== "string" || refreshedPrice === line.price) {
      return line;
    }

    return {
      ...line,
      price: refreshedPrice,
    };
  });
}
