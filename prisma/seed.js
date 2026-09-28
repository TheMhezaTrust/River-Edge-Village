import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildPlanPlots, comparePlotNumbers } from "../lib/plan-layout.js";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "public", "uploads");

// Erven digitised from the official survey layout plan.
const PLAN_PLOTS = buildPlanPlots();
const PLOT_COUNT = PLAN_PLOTS.length;

const FIRST = ["Sipho", "Nomsa", "Thabo", "Zanele", "Luthando", "Ayanda", "Mzwandile", "Noluthando", "Siyabonga", "Thandeka", "Bongani", "Ncedo", "Zintle", "Khaya", "Anele", "Sindiswa", "Mlungisi", "Nomvula", "Andile", "Bulelwa", "Sibusiso", "Nontobeko", "Xolani", "Dumisani", "Ntomboxolo", "Sandile", "Pumla", "Thembinkosi", "Zodwa", "Lwandile"];
const LAST = ["Mheza", "Nkosi", "Dlamini", "Mkhize", "Baloyi", "Khumalo", "Mahlangu", "Ndlovu", "Zulu", "Motaung", "Sithole", "Radebe", "Ngcobo", "Mbatha", "Kunene", "Mazibuko", "Ntuli", "Shabalala", "Mchunu", "Gumede"];

const pick = (arr, i) => arr[i % arr.length];
const fullName = (i) => `${pick(FIRST, i)} ${pick(LAST, i + 7)}`;
const rand = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};
const r = rand(42);
const dateStr = (d) => d.toISOString().slice(0, 10);
const monthsAgo = (n, day = 15) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d;
};

const PROMO = 75000;
const STANDARD = 90000;

async function main() {
  console.log("Seeding database...");

  // clean (FK-safe order)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.message.deleteMany();
  await prisma.task.deleteMany();
  await prisma.departmentLog.deleteMany();
  await prisma.department.deleteMany();
  await prisma.memberDocument.deleteMany();
  await prisma.document.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.plot.deleteMany();
  await prisma.member.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // sample document files
  fs.mkdirSync(uploadsDir, { recursive: true });
  const samples = {
    "trust-deed-summary.txt": "THE MHEZA TRUST - TRUST DEED SUMMARY\n\nThe Mheza Trust is registered as the legal owner of Portion 2 of Farm 970, Cove Ridge East, Buffalo City Metropolitan Municipality (31.9 hectares).\n\nThe Trust holds the land in trust for the benefit of the community members and plot holders of River Edge Rural Village, in line with the CPA Act framework and DALRRD requirements.\n\nAll The Mheza Trust projects are administered by River Edge Primary Co-Op.\n\nTrustees act democratically and in the interest of beneficiaries. Full deed available at the Trust office.",
    "river-edge-layout-plan.txt": `RIVER EDGE RURAL VILLAGE - LAYOUT PLAN NOTES\n\n- ${PLOT_COUNT} residential erven of 800m2 each, numbered per the official survey layout plan and grouped in Blocks A-E\n- Erf numbers follow the surveyor's schedule; a few numbers are skipped on the plan and some erven are subdivided (e.g. 1A, 145A/145B, 165A, 186A, 203A)\n- Primary roads: 9m-11m reserve; secondary roads: 6m minimum\n- Green spaces and dams with compliant setbacks, wetland buffers retained\n- Residential Zoning 4 (Townhouse) - application for rezoning being prepared for submission to BCMM\n- Rainwater harvesting and septic tank systems per plot\n- Eskom electricity connection existing at farm boundary`,
    "sanitation-no-objection.txt": "BUFFALO CITY METROPOLITAN MUNICIPALITY - SANITATION DIVISION\n\nNO-OBJECTION NOTICE (summary)\n\nFollowing review of the proposed residential development on Portion 2 of Farm 970, Cove Ridge East, the Sanitation Division has no objection to the proposed septic tank and French drain system per plot, subject to final engineering sign-off at building plan stage.\n\nContact: Noluthando Sondo, Sanitation Division.",
  };
  for (const [name, content] of Object.entries(samples)) {
    fs.writeFileSync(path.join(uploadsDir, name), content);
  }

  // ---------- Staff users ----------
  // Everyone can view every module; write access is limited by role (see lib/roles.js).
  const staffPassword = await bcrypt.hash("Mheza@2026", 10);
  const staffDefs = [
    { handle: "bongani", name: "Bongani Sifiniza", email: "bongani.sifiniza@themhezatrust.local", role: "SUPER_ADMIN", title: "Full access - all modules" },
    { handle: "thandile", name: "Thandile Sifiniza", email: "thandile.sifiniza@themhezatrust.local", role: "FINANCE", title: "Finances & customer records" },
    { handle: "sisanda", name: "Sisanda Toni", email: "sisanda.toni@themhezatrust.local", role: "FINANCE", title: "Finances & customer records" },
    { handle: "nokuthula", name: "Nokuthula Gedle", email: "nokuthula.gedle@themhezatrust.local", role: "FINANCE", title: "Finances & customer records" },
    { handle: "sipho", name: "Sipho Jauka", email: "sipho.jauka@themhezatrust.local", role: "PLOTS", title: "Plot records & layout" },
    { handle: "sydney", name: "Sydney Velapi", email: "sydney.velapi@themhezatrust.local", role: "PLOTS", title: "Plot records & layout" },
    { handle: "lihle", name: "Lihle Jacob", email: "lihle.jacob@themhezatrust.local", role: "PLOTS", title: "Plot records & layout" },
  ];
  const users = {};
  for (const { handle, ...def } of staffDefs) {
    // phone left blank on purpose: real staff numbers are captured by the Administrator
    users[handle] = await prisma.user.create({ data: { ...def, password: staffPassword, phone: null } });
  }

  // ---------- Projects ----------
  const riverEdge = await prisma.project.create({
    data: {
      name: "River Edge Rural Village",
      slug: "river-edge",
      description:
        `A fully planned, legally compliant rural residential community on 31.9 hectares of titled farmland. ${PLOT_COUNT} serviced 800m2 plots for 165 families, with erf numbers matching the official survey layout plan, a rezoning application in progress with BCMM, CPA governance via DALRRD, and democratic community management. River Edge combines rural heritage with modern compliance - no informal settlement, no fear of demolitions, just legal, planned land ownership. All The Mheza Trust projects are administered by River Edge Primary Co-Op.`,
      location: "Cove Ridge East, Buffalo City, Eastern Cape",
      address: "Portion 2 of Farm 970, Cove Ridge East, Buffalo City Metropolitan Municipality, Eastern Cape",
      status: "ACTIVE",
      farmSizeHa: 31.9,
      plotCount: PLOT_COUNT,
      familyCount: 165,
      promoPrice: PROMO,
      standardPrice: STANDARD,
      promoEndsAt: "2026-11-30",
      timeline: JSON.stringify([
        { label: "Land Purchased", status: "COMPLETED", date: "2023-08", description: "Portion 2 of Farm 970, Cove Ridge East acquired by the Trust." },
        { label: "Title Deed Obtained", status: "COMPLETED", date: "2023-12", description: "Title deed registered in the name of The Mheza Trust." },
        { label: "Trust Registered", status: "COMPLETED", date: "2023-06", description: "The Mheza Trust formally registered with the Master of the High Court." },
        { label: "CPA Registration", status: "IN_PROGRESS", date: "2025-03", description: "Communal Property Association registration in progress with DALRRD." },
        { label: "Rezoning Application", status: "IN_PROGRESS", date: "2026-08", description: "Application for Rezoning to Residential Zoning 4 (Townhouse). The previous application was rejected for procedural reasons under Section 74(c) of the BCMM SPLUM By-Law — not a rejection of the project. BCMM is prepared to consider a new application; a town planner is being engaged to submit it formally." },
        { label: "Sanitation Approval", status: "COMPLETED", date: "2025-05", description: "No-objection received from the BCMM Sanitation Division." },
        { label: "Waterworks Approval", status: "PENDING", date: null, description: "Awaiting engagement outcome with the Waterworks Division." },
        { label: "Infrastructure Planning", status: "PENDING", date: null, description: "Roads, drainage and services planning pending final approvals." },
        { label: "Plot Sales", status: "ONGOING", date: null, description: "Promotional sales at R75,000 per 800m2 plot until 30 November 2026." },
        { label: "Expected Completion", status: "PENDING", date: "2028", description: "Full infrastructure and occupancy target." },
      ]),
    },
  });

  await prisma.project.create({
    data: {
      name: "Qolorha Valley View",
      slug: "qolorha-valley-view",
      description:
        "A future development by The Mheza Trust, planned for the Qolorha valley area. Currently in the land-acquisition and feasibility stage, Qolorha Valley View will follow the same legal, planned-community model proven at River Edge Rural Village and will likewise be administered by River Edge Primary Co-Op.",
      location: "Qolorha, Eastern Cape (planned)",
      status: "PLANNING",
      plotCount: 120,
      promoPrice: null,
      standardPrice: null,
    },
  });

  // ---------- Plots (erven per the official survey layout plan) ----------
  const plots = [];
  PLAN_PLOTS.forEach((p, i) => {
    const n = parseInt(p.number, 10);
    let status = "AVAILABLE";
    if (n % 7 === 0) status = "SOLD";
    else if (n % 11 === 0) status = "RESERVED";
    plots.push({
      number: p.number,
      sizeSqm: 800,
      price: PROMO,
      status,
      x: p.x,
      y: p.y,
      block: p.block,
      description: `Erf ${p.number} in Block ${p.block} - 800m2 residential erf at River Edge Rural Village, numbered per the official survey layout plan, with access to ${i % 2 === 0 ? "a 9m primary road" : "a 6m secondary road"}, rainwater harvesting and septic tank provisions.`,
      projectId: riverEdge.id,
    });
  });
  await prisma.plot.createMany({ data: plots });
  const allPlots = (await prisma.plot.findMany()).sort((a, b) => comparePlotNumbers(a.number, b.number));
  const soldPlots = allPlots.filter((p) => p.status === "SOLD");
  const reservedPlots = allPlots.filter((p) => p.status === "RESERVED");

  // ---------- Members ----------
  const portalPassword = await bcrypt.hash("Member@2026", 10);
  const members = [];
  const memberPlots = [...soldPlots, ...reservedPlots.slice(0, 6)];
  for (let i = 0; i < memberPlots.length; i++) {
    const plot = memberPlots[i];
    const isSold = plot.status === "SOLD";
    const plan = isSold ? (r() < 0.5 ? "FULL" : "PLAN_12") : "PLAN_12";
    members.push(
      await prisma.member.create({
        data: {
          fullName: fullName(i),
          idNumber: `${70 + Math.floor(r() * 30)}${String(Math.floor(r() * 12) + 1).padStart(2, "0")}${String(Math.floor(r() * 28) + 1).padStart(2, "0")}${String(Math.floor(r() * 9999)).padStart(4, "0")}08${Math.floor(r() * 9)}`,
          dateOfBirth: `19${70 + Math.floor(r() * 30)}-${String(Math.floor(r() * 12) + 1).padStart(2, "0")}-15`,
          gender: i % 2 === 0 ? "Male" : "Female",
          maritalStatus: pick(["Single", "Married", "Widowed"], i),
          physicalAddress: pick(["Cove Ridge East", "Gonubie", "Vincent", "Mdantsane", "Beacon Bay", "Kayser Beach"], i) + ", Buffalo City, Eastern Cape",
          postalAddress: "Same as physical",
          phone: `07${Math.floor(10000000 + r() * 89999999)}`,
          email: `member${i + 1}@example.local`,
          password: i < 6 ? portalPassword : null,
          purchasePrice: PROMO,
          paymentPlan: plan,
          beneficiaries: JSON.stringify([{ name: fullName(i + 100), relation: pick(["Child", "Spouse", "Sibling"], i), share: "100%" }]),
          notes: isSold ? null : "Reservation deposit received.",
        },
      })
    );
  }

  // link plots to members
  for (let i = 0; i < memberPlots.length; i++) {
    await prisma.plot.update({ where: { id: memberPlots[i].id }, data: { memberId: members[i].id } });
  }

  // ---------- Payments ----------
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const plot = memberPlots[i];
    if (plot.status === "SOLD") {
      if (m.paymentPlan === "FULL") {
        await prisma.payment.create({
          data: { amount: PROMO, date: monthsAgo(Math.floor(r() * 10) + 1, Math.floor(r() * 27) + 1), method: "EFT", reference: `${plot.number} – ${m.fullName}`, memberId: m.id, plotId: plot.id, note: "Full payment - promotional price" },
        });
      } else {
        const deposit = 30000;
        await prisma.payment.create({ data: { amount: deposit, date: monthsAgo(8, 5), method: "EFT", reference: `${plot.number} – ${m.fullName}`, memberId: m.id, plotId: plot.id, note: "Deposit" } });
        for (let k = 1; k <= 6; k++) {
          await prisma.payment.create({ data: { amount: 7500, date: monthsAgo(8 - k, 5), method: "EFT", reference: `${plot.number} – ${m.fullName}`, memberId: m.id, plotId: plot.id, note: `Instalment ${k}/6` } });
        }
      }
    } else {
      await prisma.payment.create({ data: { amount: 15000, date: monthsAgo(2, 10), method: "EFT", reference: `${plot.number} – ${m.fullName}`, memberId: m.id, plotId: plot.id, note: "Reservation deposit" } });
    }
  }

  // ---------- Income & expenses ----------
  const payments = await prisma.payment.findMany({ include: { plot: true } });
  for (const p of payments) {
    await prisma.income.create({
      data: { date: p.date, description: `Plot ${p.plot?.number ?? ""} payment - ${p.note ?? ""}`.trim(), project: "River Edge Rural Village", amount: p.amount, category: "PLOT_SALE", method: p.method, reference: p.reference },
    });
  }
  await prisma.income.create({ data: { date: monthsAgo(4, 2), description: "Community donation - infrastructure fund", project: "River Edge Rural Village", amount: 25000, category: "DONATION", method: "EFT", reference: "DON-001" } });

  const expenseDefs = [
    ["Legal fees - rezoning application", "LEGAL", 48000, "Naidoo & Partners Attorneys"],
    ["Land surveyor - subdivision layout", "CONTRACTOR", 65000, "Border Surveying CC"],
    ["Town planning consultancy", "CONTRACTOR", 55000, "BCMM-approved Town Planners"],
    ["Environmental impact assessment", "FEES", 32000, "IEM Consultants"],
    ["Marketing - signage and flyers", "MARKETING", 12000, "East London Print Works"],
    ["Office supplies", "SUPPLIES", 3400, "Waltons East London"],
    ["Community meeting catering", "OTHER", 5200, "Local caterers"],
    ["Security fencing - dam area", "CONTRACTOR", 28000, "Border Fencing"],
    ["Trust registration and compliance fees", "FEES", 8600, "Master of the High Court"],
    ["Soil and percolation testing", "CONTRACTOR", 18500, "Geotech EC"],
  ];
  for (let i = 0; i < expenseDefs.length; i++) {
    const [description, category, amount, vendor] = expenseDefs[i];
    await prisma.expense.create({ data: { date: monthsAgo(i + 1, 20), description, category, amount, vendor, project: "River Edge Rural Village" } });
  }
  for (let m = 11; m >= 0; m--) {
    await prisma.expense.create({ data: { date: monthsAgo(m, 25), description: "Monthly salaries", category: "SALARY", amount: 103000, vendor: "Payroll", project: "River Edge Rural Village" } });
  }

  // ---------- Payroll ----------
  const payrollDefs = [
    ["Bongani Sifiniza", "Administrator", 18000, 1080, 180, 180],
    ["Thandile Sifiniza", "Finance & Member Records", 16500, 920, 165, 165],
    ["Sisanda Toni", "Finance & Member Records", 15000, 780, 150, 150],
    ["Nokuthula Gedle", "Finance & Member Records", 14500, 720, 145, 145],
    ["Sipho Jauka", "Plot Administrator", 13500, 560, 135, 135],
    ["Sydney Velapi", "Plot Administrator", 13000, 520, 130, 130],
    ["Lihle Jacob", "Plot Administrator", 12500, 470, 125, 125],
  ];
  for (const [name, jobTitle, salary, paye, uif, sdl] of payrollDefs) {
    await prisma.employee.create({ data: { name, jobTitle, salary, paye, uif, sdl, startDate: "2024-02-01" } });
  }

  // ---------- Inquiries ----------
  const inquiryDefs = [
    ["Lerato Mahlangu", "lerato.m@example.com", "0821234567", "NEW", null, "I would like to know about payment plans for a plot near the dam."],
    ["Johan van Wyk", "jvw@example.com", "0833456789", "NEW", 12, "Is plot 12 still available? Can I view it this weekend?"],
    ["Nokwanda Zulu", "nokwanda@example.com", "0712345678", "CONTACTED", 44, "Interested in two adjacent erven (43 and 44) for my children."],
    ["Peter Adams", "p.adams@example.com", "0844556677", "CONVERTED", null, "Wants to buy with full payment before November 2026."],
    ["Thandiwe Mbatha", "thandiwe@example.com", "0615554433", "NEW", 88, "Do you allow building immediately after purchase?"],
    ["Siphamandla Kunene", "sipha@example.com", "0785554433", "CLOSED", null, "No longer interested - bought elsewhere."],
    ["Grace Ntuli", "grace.n@example.com", "0795556666", "CONTACTED", 103, "Asked about the CPA structure and governance."],
    ["Mandla Sithole", "mandla.s@example.com", "0665557777", "NEW", null, "Requesting a site visit for a group of 5 families."],
  ];
  const plotsByNumber = Object.fromEntries(allPlots.map((p) => [p.number, p]));
  for (const [name, email, phone, status, plotNum, message] of inquiryDefs) {
    await prisma.inquiry.create({
      data: { name, email, phone, status, message, plotId: plotNum ? plotsByNumber[plotNum]?.id ?? null : null, assignedTo: users.nokuthula.id, createdAt: monthsAgo(Math.floor(r() * 3), Math.floor(r() * 27) + 1) },
    });
  }

  // ---------- Departments ----------
  const deptDefs = [
    ["Buffalo City Metropolitan Municipality (BCMM)", "Mr Kershan Naidoo (City Planner: Land Use Management); Thato B. Ralake", "043 705 2000", "kershan.naidoo@bcmm.gov.za", "IN_PROGRESS", "Meeting held 18 Aug 2026. BCMM is prepared to consider an application for Rezoning to Residential Zoning 4 (Townhouse). Previous application was rejected for procedural reasons under Section 74(c) of the BCMM SPLUM By-Law — not a rejection of the project. Next: engage a town planner, consult Water & Sanitation, pay fees, submit formal application for publication and departmental circulation.", "2026-10-15"],
    ["Sanitation Division (BCMM)", "Noluthando Sondo", "043 705 4400", "nsondo@bcmm.gov.za", "NO_OBJECTION", "No-objection received for septic tank and French drain system per plot.", "2026-11-01"],
    ["Waterworks Division (BCMM)", "Sikiza Sbongiseni Yekane", "043 705 4500", "syekane@bcmm.gov.za", "PENDING", "Awaiting response on water supply and rainwater harvesting endorsement.", "2026-10-01"],
    ["DALRRD", "Ms Peliwe Mntukatandwa; Mr Mapudi Morakiwa; Mr Mpho Sikwe", "012 846 8320", "pmntukatandwa@dalrrd.gov.za", "IN_PROGRESS", "CPA registration in progress. Document set submitted, awaiting verification.", "2026-10-20"],
    ["IEM (Environmental)", "To be confirmed", null, null, "PENDING", "Environmental authorisation engagement pending.", "2026-11-10"],
    ["City Health (BCMM)", "Helen Neale-May", "043 705 4600", "hnealemay@bcmm.gov.za", "PENDING", "Health impact of sanitation approach to be confirmed.", "2026-10-25"],
    ["Department of Water Affairs", "To be confirmed", null, null, "PENDING", "Water use authorisation for dam setback and rainwater harvesting.", "2026-11-05"],
    ["DEDEA", "To be confirmed", null, null, "PENDING", "Provincial environmental affairs engagement pending.", "2026-11-15"],
    ["Roads and Transport (BCMM)", "To be confirmed", "043 705 5000", null, "PENDING", "Road reserve widths (6m min, 9-11m primary) to be confirmed.", "2026-10-30"],
    ["Engineering Services (BCMM)", "To be confirmed", "043 705 5100", null, "PENDING", "Civil engineering standards for internal roads and stormwater.", "2026-11-20"],
  ];
  for (const [name, contactPerson, phone, email, status, notes, followUpDate] of deptDefs) {
    const dept = await prisma.department.create({ data: { name, contactPerson, phone, email, status, notes, followUpDate } });
    await prisma.departmentLog.create({ data: { date: monthsAgo(1, 10), method: "EMAIL", summary: `Status follow-up with ${name}. Current standing: ${status.replace("_", " ").toLowerCase()}.`, nextSteps: followUpDate ? `Follow up on ${followUpDate}` : null, departmentId: dept.id } });
  }

  // ---------- Documents ----------
  const docDefs = [
    ["Trust Deed Summary", "TRUST", "trust,deed,governance", "Summary of The Mheza Trust deed and trustee mandate.", "/files/trust-deed-summary.txt", "trust-deed-summary.txt"],
    ["River Edge Layout Plan Notes", "PROJECT", "layout,plan,mapping", "Plot layout, road network and green space notes.", "/files/river-edge-layout-plan.txt", "river-edge-layout-plan.txt"],
    ["Sanitation No-Objection", "DEPARTMENT", "bcmm,sanitation,approval", "No-objection notice summary from BCMM Sanitation Division.", "/files/sanitation-no-objection.txt", "sanitation-no-objection.txt"],
    ["Title Deed - Portion 2 of Farm 970", "LEGAL", "title,deed,land", "Registered title deed (scan on file at Trust office).", "#", "title-deed-970.pdf"],
    ["CPA Registration Submission", "LEGAL", "cpa,dalrrd", "Full CPA registration submission pack to DALRRD.", "#", "cpa-submission.pdf"],
    ["Rezoning Application - Zoning 4", "PROJECT", "rezoning,bcmm", "Rezoning application documents submitted to BCMM.", "#", "rezoning-application.pdf"],
    ["2025/26 Annual Financial Statement", "FINANCIAL", "finance,annual", "Draft annual financial statement.", "#", "afs-2025-26.xlsx"],
    ["Trustee Meeting Minutes - Q2", "MINUTES", "minutes,trustees", "Minutes of the quarterly trustee meeting.", "#", "minutes-q2.pdf"],
    ["Beneficiary Nomination Form (Template)", "MEMBER", "template,beneficiary", "Blank nomination form for members.", "#", "beneficiary-form.pdf"],
  ];
  for (const [title, folder, tags, description, filePath, fileName] of docDefs) {
    await prisma.document.create({ data: { title, folder, tags, description, filePath, fileName, uploadedById: users.bongani.id, sizeKb: filePath === "#" ? null : 12 } });
  }

  // ---------- Tasks ----------
  const taskDefs = [
    ["Follow up BCMM rezoning comment period", "Check whether the public comment period has closed and request the tribunal date.", users.bongani.id, "IN_PROGRESS", "HIGH", dateStr(monthsAgo(-1, 15))],
    ["Submit water use authorisation forms", "Complete DWS forms for dam setback and rainwater harvesting.", users.bongani.id, "TODO", "MEDIUM", dateStr(monthsAgo(-2, 1))],
    ["Prepare October member newsletter", "Summarise approvals progress for plot holders.", users.nokuthula.id, "TODO", "MEDIUM", dateStr(monthsAgo(-1, 5))],
    ["Reconcile September bank statement", "Match EFT references to member payments.", users.thandile.id, "IN_PROGRESS", "HIGH", dateStr(monthsAgo(0, 28))],
    ["Convert Peter Adams inquiry to member", "Full payment confirmed - create member record and assign erf.", users.nokuthula.id, "COMPLETED", "URGENT", null],
    ["Update promotional signage on site", "New R75,000 promo boards at farm entrance.", users.nokuthula.id, "TODO", "LOW", dateStr(monthsAgo(-1, 20))],
    ["Compile DALRRD response pack", "Gather outstanding CPA verification documents.", users.bongani.id, "TODO", "HIGH", dateStr(monthsAgo(-1, 10))],
    ["Schedule community feedback meeting", "Book venue and notify plot holders.", users.nokuthula.id, "IN_PROGRESS", "MEDIUM", dateStr(monthsAgo(-1, 25))],
    ["Verify erf sizes against surveyor's schedule", "Confirm 800m2 extents and the subdivided erven (1A, 145A/145B, 165A, 186A, 203A) against the layout plan.", users.sipho.id, "IN_PROGRESS", "HIGH", dateStr(monthsAgo(-1, 8))],
    ["Mark sold erven on the layout plan", "Update erf availability after the September sales.", users.sydney.id, "TODO", "MEDIUM", dateStr(monthsAgo(0, 20))],
    ["Percolation test results to engineers", "Forward soil test results to BCMM Engineering Services.", users.lihle.id, "COMPLETED", "MEDIUM", null],
    ["Draft 2026/27 budget", "Infrastructure and approvals budget for trustee review.", users.thandile.id, "TODO", "MEDIUM", dateStr(monthsAgo(-2, 15))],
    ["Send payment reminders - instalment plan members", "Members behind on 12-month plans.", users.sisanda.id, "TODO", "HIGH", dateStr(monthsAgo(0, 30))],
    ["Audit access log for member documents", "Quarterly document access review.", users.bongani.id, "TODO", "LOW", dateStr(monthsAgo(-3, 1))],
  ];
  for (const [title, description, assignedTo, status, priority, dueDate] of taskDefs) {
    await prisma.task.create({ data: { title, description, assignedTo, status, priority, dueDate, createdBy: users.bongani.id } });
  }

  // ---------- Announcements ----------
  const publicAnnouncements = [
    ["BCMM Rezoning Guidance Received", "Following a meeting on 18 August 2026, BCMM confirmed it is prepared to consider an application for Rezoning to Residential Zoning 4 (Townhouse). The previous application was rejected for procedural reasons under Section 74(c) of the BCMM SPLUM By-Law — not a rejection of the project. The Trust is engaging a town planner to submit a formal application. See the BCMM Zoning Status on the Project Status page.", "APPROVALS"],
    ["Sanitation No-Objection Received", "The BCMM Sanitation Division has issued a no-objection for the proposed per-plot septic tank and French drain system, a key milestone for the development.", "APPROVALS"],
    ["Promotional Pricing Extended", "R75,000 promotional pricing for 800m2 plots has been confirmed until 30 November 2026. After this date, the standard price of R90,000 applies. Full payment is required to qualify for the promotional price.", "SALES"],
    ["CPA Registration Progress", "The Trust's CPA registration submission is under verification with DALRRD. Members will be informed of the registration outcome and the first CPA general meeting.", "GOVERNANCE"],
  ];
  for (const [title, body, category] of publicAnnouncements) {
    await prisma.announcement.create({ data: { title, body, audience: "PUBLIC", category, authorId: users.bongani.id, createdAt: monthsAgo(Math.floor(r() * 4) + 1, 8) } });
  }
  await prisma.announcement.create({ data: { title: "Quarterly trustee meeting - 15 October", body: "All staff and trustees: quarterly meeting at the Trust office, 15 October 09:00. Agenda: approvals status, sales report, budget review.", audience: "INTERNAL", category: "MEETINGS", authorId: users.bongani.id, createdAt: monthsAgo(0, 20) } });
  await prisma.announcement.create({ data: { title: "Payment reference format", body: "Effective immediately, all member payments must use the reference format Plot Number – Buyer Name (per Terms and Conditions of Sale clause 6.4), e.g. \"12 – Your Full Name\". Finance to reconcile weekly.", audience: "INTERNAL", category: "FINANCE", authorId: users.thandile.id, createdAt: monthsAgo(1, 12) } });

  // ---------- Messages ----------
  await prisma.message.create({ data: { subject: "Bank reconciliation", body: "Hi Thandile, please prioritise the September reconciliation before the trustee meeting - several EFTs lack references.", fromId: users.bongani.id, toId: users.thandile.id, createdAt: monthsAgo(0, 21) } });
  await prisma.message.create({ data: { subject: "Site visit Saturday", body: "Sisanda, the Adams family wants a site visit this Saturday 10:00. Please arrange access and take the layout plan.", fromId: users.nokuthula.id, toId: users.sisanda.id, createdAt: monthsAgo(0, 22) } });
  await prisma.message.create({ data: { subject: "Layout plan updates", body: "Sipho, please update the layout plan to reflect the erven sold last month and confirm the subdivided erf numbers with the surveyor.", fromId: users.bongani.id, toId: users.sipho.id, isRead: true, createdAt: monthsAgo(1, 9) } });

  // ---------- Notifications ----------
  const notifDefs = [
    [users.nokuthula.id, "3 new inquiries received from the public website", "INQUIRY"],
    [users.thandile.id, "Payment received: R7,500 (Erf 49 instalment 6)", "PAYMENT"],
    [users.bongani.id, "Sanitation Division responded: no-objection issued", "DEPARTMENT"],
    [users.thandile.id, "Task 'Reconcile September bank statement' is due soon", "TASK"],
    [users.sipho.id, "New member document uploaded: beneficiary form", "DOCUMENT"],
  ];
  for (const [userId, text, type] of notifDefs) {
    await prisma.notification.create({ data: { userId, text, type, createdAt: monthsAgo(0, Math.floor(r() * 20) + 2) } });
  }

  // ---------- Audit seed ----------
  await prisma.auditLog.create({ data: { userId: users.bongani.id, action: "SYSTEM_SEEDED", entity: "SYSTEM", details: "Initial demonstration dataset" } });

  console.log("Seed complete.");
  console.log(`  Staff users: ${staffDefs.length} (password: Mheza@2026)`);
  console.log(`  Members: ${members.length} (first 6 portal-enabled, password: Member@2026)`);
  console.log(`  Plots: ${allPlots.length} (${soldPlots.length} sold, ${reservedPlots.length} reserved)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
