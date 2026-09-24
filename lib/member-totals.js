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
