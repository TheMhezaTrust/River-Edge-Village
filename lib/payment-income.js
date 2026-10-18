// A member payment also produces an Income row, because Finance reports on Income
// while the member's statement reports on Payment. The two have to stay in step, so
// the shape of that income row is defined once here rather than repeated per route.

export function incomeDescription(memberFullName, plotNumber) {
  return `Payment from ${memberFullName}${plotNumber ? ` (Plot ${plotNumber})` : ""}`;
}

export const INCOME_PROJECT = "River Edge Rural Village";
