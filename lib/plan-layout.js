// Digitised from the official River Edge Rural Village survey layout plan.
// Coordinates live in a 1600 x 780 plan-pixel space; each band keeps the
// erf sequence and adjacency observed on the drawing.
export const PLAN_W = 1600;
export const PLAN_H = 780;
export const PLAN_CELL_W = 30;
export const PLAN_CELL_H = 22;

// { nums, at: [x, y], step: [dx, dy], block, note? }
// `note` marks numbers whose handwriting was hard to read on the plan.
export const BANDS = [
  // ---------- Block A · north-west terraces ----------
  { block: "A", nums: ["235", "234", "233", "232", "231", "230", "229"], at: [60, 60], step: [56, 0] },
  { block: "A", nums: ["223", "224", "225", "226", "227", "228"], at: [60, 115], step: [56, 0] },
  { block: "A", nums: ["202", "201", "200", "199", "198", "197", "196"], at: [60, 170], step: [56, 0] },
  { block: "A", nums: ["203A", "203", "189", "188", "185", "181", "180"], at: [60, 225], step: [50, 0] },
  { block: "A", nums: ["186A", "186", "191", "192", "190", "193"], at: [60, 280], step: [50, 0], note: ["186A", "191", "192", "190", "193"] },
  { block: "A", nums: ["222", "221", "220"], at: [470, 60], step: [0, 55] },
  { block: "A", nums: ["219", "218", "217"], at: [470, 230], step: [0, 55] },
  { block: "A", nums: ["216", "215", "214", "213", "211", "210", "209", "208"], at: [60, 340], step: [52, 0], note: ["211"] },

  // ---------- Block B · north-east cluster ----------
  { block: "B", nums: ["1", "1A", "3", "5", "6", "7"], at: [600, 60], step: [52, 0] },
  { block: "B", nums: ["18", "2", "4", "8", "9"], at: [600, 115], step: [52, 0], note: ["18"] },
  { block: "B", nums: ["10", "33", "32", "31", "30"], at: [600, 170], step: [52, 0] },
  { block: "B", nums: ["26", "27"], at: [600, 225], step: [52, 0] },
  { block: "B", nums: ["25", "24"], at: [600, 280], step: [52, 0] },
  { block: "B", nums: ["28", "29"], at: [600, 335], step: [52, 0] },
  { block: "B", nums: ["23", "21", "20", "22"], at: [720, 225], step: [46, 0] },
  { block: "B", nums: ["11", "12", "13", "14", "15", "16", "17", "19"], at: [920, 60], step: [0, 40] },
  { block: "B", nums: ["35", "36", "37", "38", "40", "39", "41"], at: [600, 390], step: [52, 0], note: ["40", "39", "41"] },

  // ---------- Block E · eastern column ----------
  { block: "E", nums: ["42", "43", "44", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56"], at: [1120, 60], step: [0, 26] },
  { block: "E", nums: ["60", "58", "236", "57"], at: [1180, 60], step: [0, 40], note: ["236"] },

  // ---------- Block C · central columns (upper group) ----------
  { block: "C", nums: ["110", "109", "108", "107"], at: [1360, 60], step: [0, 40] },
  { block: "C", nums: ["96", "79", "78", "77"], at: [1420, 60], step: [0, 40], note: ["96"] },
  { block: "C", nums: ["206", "205", "130"], at: [1480, 60], step: [0, 40], note: ["130"] },

  // ---------- Block C · central columns (lower group) ----------
  { block: "C", nums: ["95", "99", "111", "112", "113", "114", "115"], at: [60, 450], step: [0, 40] },
  { block: "C", nums: ["97", "105", "104", "103", "102", "101", "100", "98", "47A"], at: [160, 450], step: [0, 34], note: ["97", "47A"] },
  { block: "C", nums: ["88", "89", "90", "91", "92", "93", "94"], at: [260, 450], step: [0, 40] },
  { block: "C", nums: ["86", "85", "84", "83", "82", "81", "80"], at: [360, 450], step: [0, 40] },
  { block: "C", nums: ["69", "70", "71", "72", "73", "74", "75", "76"], at: [460, 450], step: [0, 36] },
  { block: "C", nums: ["68", "67", "66", "65", "64", "63", "62", "61"], at: [560, 450], step: [0, 36] },

  // ---------- Block C · central rows ----------
  { block: "C", nums: ["195", "194", "184"], at: [640, 460], step: [46, 0], note: ["184"] },
  { block: "C", nums: ["179", "178", "177", "176"], at: [640, 520], step: [46, 0] },
  { block: "C", nums: ["207", "174", "175", "173", "187"], at: [640, 580], step: [46, 0], note: ["207", "187"] },

  // ---------- Block D · south and south-west ----------
  { block: "D", nums: ["125", "118", "119"], at: [900, 450], step: [0, 40], note: ["125"] },
  { block: "D", nums: ["117", "126"], at: [960, 450], step: [0, 40] },
  { block: "D", nums: ["145B", "145A", "145", "146", "147"], at: [1040, 520], step: [50, 0] },
  { block: "D", nums: ["148", "149", "150", "151", "152", "153", "154", "155", "156", "157", "158", "159", "160"], at: [1100, 570], step: [38, 0] },
  { block: "D", nums: ["120", "121", "122", "123", "124"], at: [900, 620], step: [46, 0] },
  { block: "D", nums: ["136", "137", "138", "139", "142", "143", "144"], at: [900, 680], step: [46, 0], note: ["142"] },
  { block: "D", nums: ["167", "165A", "165", "164", "163", "162", "161"], at: [1100, 730], step: [46, 0] },
];

export function buildPlanPlots() {
  const out = [];
  for (const band of BANDS) {
    band.nums.forEach((number, i) => {
      out.push({
        number,
        block: band.block,
        x: band.at[0] + i * band.step[0],
        y: band.at[1] + i * band.step[1],
      });
    });
  }
  return out;
}

// Block zones are not contiguous on the plan (Block C wraps two column groups
// and the central rows), so each label is anchored explicitly.
export const BLOCK_LABELS = [
  { block: "A", x: 45, y: 42, label: "BLOCK A · NORTH-WEST" },
  { block: "B", x: 585, y: 42, label: "BLOCK B · NORTH-EAST" },
  { block: "E", x: 1105, y: 42, label: "BLOCK E · EAST" },
  { block: "C", x: 1345, y: 42, label: "BLOCK C" },
  { block: "C", x: 45, y: 432, label: "BLOCK C · CENTRAL COLUMNS" },
  { block: "C", x: 625, y: 432, label: "BLOCK C · CENTRAL ROWS" },
  { block: "D", x: 885, y: 432, label: "BLOCK D · SOUTH" },
];

// Dams, wetland buffers and green belts, positioned in the open areas of the plan.
export const PLAN_DECOR = {
  dams: [
    { cx: 1275, cy: 300, rx: 55, ry: 82, label: "DAM" },
    { cx: 740, cy: 690, rx: 108, ry: 48, label: "DAM" },
  ],
  buffers: [
    { x: 1206, y: 204, w: 138, h: 192 },
    { x: 612, y: 622, w: 256, h: 136 },
    { x: 16, y: 744, w: 1568, h: 18 },
  ],
  green: [
    { x: 1230, y: 60, w: 90, h: 120, label: "GREEN BELT" },
    { x: 1420, y: 610, w: 150, h: 100, label: "GREEN BELT" },
  ],
};

export function uncertainReadings() {
  const set = new Set();
  for (const band of BANDS) for (const n of band.note || []) set.add(n);
  return [...set];
}

// Erf numbers are not purely numeric ("145A", "203A"), so sort by the numeric
// part first and put suffixed subdivisions directly after their parent erf.
export function plotSortKey(number) {
  const m = String(number).match(/^(\d+)(.*)$/);
  if (!m) return [Number.MAX_SAFE_INTEGER, String(number)];
  return [parseInt(m[1], 10), m[2]];
}

export function comparePlotNumbers(a, b) {
  const [na, sa] = plotSortKey(a);
  const [nb, sb] = plotSortKey(b);
  if (na !== nb) return na - nb;
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

export function sortPlotsByNumber(plots) {
  return [...plots].sort((a, b) => comparePlotNumbers(a.number, b.number));
}
