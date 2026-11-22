// A member can own multiple plots (Plot.memberId is a non-unique FK).
// Total price is the member's purchasePrice override when set, otherwise the
// sum of their plots' prices. Keep this the single source of truth so the
// portal, staff member pages, finance and reports all agree.
export function memberPrice(member) {
  if (member?.purchasePrice != null) return member.purchasePrice;
  return (member?.plots || []).reduce((s, p) => s + (p.price || 0), 0);
}

export function memberTotals(member) {
  const price = memberPrice(member);
  const totalPaid = (member?.payments || []).reduce((s, p) => s + p.amount, 0);
  return { price, totalPaid, outstandingBalance: Math.max(0, price - totalPaid) };
}

// ---------- Plot usage entitlement ----------
//
// How many of the plots a member holds they have actually paid for. Some sales are
// negotiated as one bulk figure, so when the member record carries a purchasePrice
// override that figure — not the individual plot prices — is what they were charged,
// and it is split evenly across the plots they hold to give each one an effective
// price. With no override, each plot's own price stands.
//
// Plots are walked oldest-first and each effective price is taken off what the member
// has paid. While the running balance holds the plot is unlocked; the first plot that
// drives it negative is locked, and so is every plot after it — a cheap later plot does
// not get to jump the queue.
//
// This is deliberately NOT the Right of Use status. That turns on whether the Trust has
// issued the Certificate of Land Use for the erf (Plot.certificateIssuedAt) and is a
// recorded legal fact; this is only a reading of the payments. A plot can legitimately
// show both "Active (Certificate Issued)" and "Locked (Pending Payment)", so the two are
// rendered as separate, separately labelled fields.
//
// purchasedAt is nullable, and the order decides which side of the line each plot falls
// on, so a plot with no date of its own falls back to the member's recorded purchase
// date and one with neither sorts last: it cannot be shown to be the oldest purchase.
// Ties break on plot number, so the answer never depends on the order rows came back in.
const UNDATED = Number.MAX_SAFE_INTEGER; // finite, or two undated plots would compare as NaN
const purchasedOrder = (plot, member) => {
  const at = plot.purchasedAt || member?.purchaseDate;
  return at ? new Date(at).getTime() : UNDATED;
};

// Money that reaches a person's eyes is rounded to whole cents once, here, so the figures
// on screen add up exactly instead of showing a float residue as a half-cent shortfall.
const toCents = (n) => Math.round(n * 100) / 100;

export function plotEntitlement(member) {
  const plots = member?.plots || [];
  const { totalPaid } = memberTotals(member);
  const usesOverride = member?.purchasePrice != null;
  const effectivePerPlot = usesOverride && plots.length ? member.purchasePrice / plots.length : null;

  const ordered = [...plots].sort((a, b) => {
    const byDate = purchasedOrder(a, member) - purchasedOrder(b, member);
    if (byDate !== 0) return byDate;
    return String(a.number ?? "").localeCompare(String(b.number ?? ""), undefined, { numeric: true });
  });

  let running = totalPaid;
  let lockedFrom = null;
  const walked = ordered.map((plot, index) => {
    const effectivePrice = effectivePerPlot ?? plot.price ?? 0;
    running -= effectivePrice;
    // Rounded to whole cents before the comparison: an override divided across plots is
    // rarely exact, and float residue must not decide whether a member may use their erf.
    const paidUp = Math.round(running * 100) >= 0;
    if (lockedFrom === null && !paidUp) lockedFrom = index;
    return { plot, index, effectivePrice, after: running, unlocked: lockedFrom === null || index < lockedFrom };
  });

  // Only positive figures leave this function. A locked plot used to carry the running
  // balance, which by the third or fourth plot reads as a debt several times the price of
  // the erf and tells nobody what to do. It now carries the shortfall: what is still needed
  // before that plot unlocks. Because the walk is cumulative, that single number also covers
  // every locked plot before it — pay it and the queue up to that erf is cleared.
  const rows = walked.map(({ plot, index, effectivePrice, after, unlocked }) => ({
    id: plot.id,
    number: plot.number,
    block: plot.block ?? null,
    price: plot.price ?? 0,
    effectivePrice,
    purchasedAt: plot.purchasedAt ?? null,
    dated: Boolean(plot.purchasedAt),
    order: index + 1,
    unlocked,
    remaining: unlocked ? toCents(Math.max(0, after)) : 0,
    shortfall: unlocked ? 0 : toCents(Math.max(0, -after)),
  }));

  return {
    totalPaid,
    plotCount: plots.length,
    unlockedCount: rows.filter((r) => r.unlocked).length,
    usesOverride,
    effectivePerPlot,
    undatedCount: rows.filter((r) => !r.dated).length,
    plots: rows,
  };
}
