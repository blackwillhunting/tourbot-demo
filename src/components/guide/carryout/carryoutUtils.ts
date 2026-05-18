import type { CarryoutPreCartLine } from "./carryoutTypes";

export function carryoutLineKey(line?: CarryoutPreCartLine | null) {
  return String(line?.lineItemId || line?.id || line?.targetId || "");
}

export function formatCarryoutMoney(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? `$${value.toFixed(2)}`
    : "—";
}

export function carryoutDisplayTitle(
  line: CarryoutPreCartLine,
  phraseFromId: (value?: string | null) => string,
) {
  return line.title || phraseFromId(line.targetId || line.id || "Item");
}

export function carryoutLineDetails(
  line: CarryoutPreCartLine,
  formatPriceDelta: (value?: number | null) => string,
) {
  const details: string[] = [];

  (line.knownSelections || []).forEach((selection) => {
    if (selection && !details.includes(selection)) details.push(selection);
  });

  (line.qualifiers || []).forEach((qualifier) => {
    const valueLabel = qualifier.valueLabel || qualifier.value;
    if (valueLabel && !details.includes(String(valueLabel))) {
      details.push(String(valueLabel));
    }
  });

  (line.modifiers || []).forEach((modifier) => {
    const label = modifier.label;
    if (label && !details.includes(label)) {
      details.push(`${label}${formatPriceDelta(modifier.priceDelta)}`);
    }
  });

  (line.upgrades || []).forEach((upgrade) => {
    const label = upgrade.label;
    if (label && !details.includes(label)) {
      details.push(`${label}${formatPriceDelta(upgrade.priceDelta)}`);
    }
  });

  return details;
}
