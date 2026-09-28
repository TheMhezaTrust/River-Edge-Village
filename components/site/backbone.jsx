// Presentational building blocks for the "How Our Projects Work" backbone
// diagrams. Tooltips and the animated signal flow are CSS-only, so these
// render as plain server components with no extra client JavaScript.

export const BACKBONE_COLORS = {
  brain: "#1A3A5C",
  spine: "#4A4A4A",
  investor: "#2E7D32",
  customer: "#E65100",
  community: "#00695C",
};

const ICON_PATHS = {
  brain: (
    <>
      <path d="M12 4.5A3.5 3.5 0 0 0 8.5 8c-1.6.4-2.8 1.9-2.8 3.6 0 1.1.5 2.1 1.3 2.8-.2.5-.3 1-.3 1.5a3.4 3.4 0 0 0 3.4 3.4c.4 1.2 1.5 2.2 2.9 2.2" />
      <path d="M12 4.5A3.5 3.5 0 0 1 15.5 8c1.6.4 2.8 1.9 2.8 3.6 0 1.1-.5 2.1-1.3 2.8.2.5.3 1 .3 1.5a3.4 3.4 0 0 1-3.4 3.4c-.4 1.2-1.5 2.2-2.9 2.2" />
      <path d="M12 4.5v17" />
    </>
  ),
  spine: (
    <>
      <rect x="9.5" y="3" width="5" height="4.5" rx="1.5" />
      <rect x="9.5" y="9.75" width="5" height="4.5" rx="1.5" />
      <rect x="9.5" y="16.5" width="5" height="4.5" rx="1.5" />
      <path d="M12 7.5v2.25M12 14.25v2.25" />
    </>
  ),
  seed: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13c0-4.2 3.1-7 7.2-7 0 4.2-3.1 7-7.2 7z" />
      <path d="M12 16.5c0-3-2.4-5-5.2-5 0 3 2.4 5 5.2 5z" />
    </>
  ),
  house: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4.5" />
    </>
  ),
};

function Icon({ name, label }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        role="img"
        aria-label={label}
      >
        {ICON_PATHS[name]}
      </svg>
    </span>
  );
}

// Shared arrowhead marker, defined once per diagram so every animated path
// can reference it by id.
function FlowDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#6b7280" />
        </marker>
      </defs>
    </svg>
  );
}

// Vertical two-way connector: command flows down, signal flows back up.
function VertFlow({ className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-1 ${className}`} aria-hidden="true">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Command ↓</span>
      <svg viewBox="0 0 40 56" className="h-14 w-10" fill="none" strokeWidth="2" stroke="#6b7280">
        <path d="M14 4 V46" className="flow-dash" markerEnd="url(#flowArrow)" />
        <path d="M26 52 V10" className="flow-dash" markerEnd="url(#flowArrow)" />
      </svg>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">↑ Signal</span>
    </div>
  );
}

// Desktop-only connector that forks the spinal cord out to both sides and
// carries their signals back up.
function BranchFlow() {
  return (
    <svg viewBox="0 0 400 70" className="hidden md:block h-16 w-full" fill="none" strokeWidth="2" stroke="#6b7280" aria-hidden="true">
      <path d="M192 4 C192 34, 96 30, 96 62" className="flow-dash" markerEnd="url(#flowArrow)" />
      <path d="M208 4 C208 34, 304 30, 304 62" className="flow-dash" markerEnd="url(#flowArrow)" />
      <path d="M112 66 C112 36, 184 32, 184 8" className="flow-dash" markerEnd="url(#flowArrow)" />
      <path d="M288 66 C288 36, 216 32, 216 8" className="flow-dash" markerEnd="url(#flowArrow)" />
    </svg>
  );
}

function Node({ color, icon, iconLabel, label, sublabel, badge, tooltip, className = "" }) {
  return (
    <div
      tabIndex={0}
      aria-label={`${label}: ${sublabel}. ${tooltip}`}
      className={`group relative cursor-help rounded-2xl p-5 text-white shadow-lg outline-none ring-2 ring-transparent focus-visible:ring-sunset-400 ${className}`}
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center gap-4">
        <Icon name={icon} label={iconLabel} />
        <div className="min-w-0">
          <p className="font-extrabold tracking-wide">{label}</p>
          <p className="mt-0.5 text-sm text-white/85">{sublabel}</p>
          {badge && (
            <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide">{badge}</span>
          )}
        </div>
      </div>
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 p-3 text-xs font-normal leading-relaxed text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus:opacity-100"
      >
        {tooltip}
      </div>
    </div>
  );
}

export function BackboneDiagram() {
  return (
    <div className="relative mx-auto max-w-3xl">
      <FlowDefs />

      <div className="mx-auto max-w-md">
        <Node
          color={BACKBONE_COLORS.brain}
          icon="brain"
          iconLabel="Brain icon"
          label="THE BRAIN – The Mheza Trust"
          sublabel="Researches, Designs, Commands"
          tooltip="The Trust researches every opportunity, designs the project and creates two separate contracts — one for the Investor side and one for the Customer side."
        />
      </div>

      <VertFlow />

      <div className="mx-auto max-w-md">
        <Node
          color={BACKBONE_COLORS.spine}
          icon="spine"
          iconLabel="Spinal cord icon"
          label="THE SPINAL CORD"
          sublabel="Holds Assets, Routes Signals, Protects Rights"
          badge="Contract C – Trust Operating Contract"
          tooltip="The spinal cord holds all project assets and routes every signal according to the contract it came from, so neither side can be abused by the other."
        />
      </div>

      <BranchFlow />
      <VertFlow className="md:hidden" />

      <div className="grid gap-4 md:grid-cols-2 md:gap-10">
        <Node
          color={BACKBONE_COLORS.investor}
          icon="seed"
          iconLabel="Seed icon representing investment"
          label="INVESTOR SIDE"
          sublabel="Contract A – Brings Land or Cash"
          badge="Contract A"
          tooltip="The Investor brings a large asset — cash or land — and receives a return defined only by Contract A."
        />
        <VertFlow className="md:hidden" />
        <Node
          color={BACKBONE_COLORS.customer}
          icon="house"
          iconLabel="House icon representing the plot buyer"
          label="CUSTOMER SIDE"
          sublabel="Contract B – Brings Cash for a Plot"
          badge="Contract B"
          tooltip="The Customer brings money to buy a plot and receives the plot rights defined only by Contract B."
        />
      </div>

      <VertFlow />

      <div className="mx-auto max-w-md">
        <Node
          color={BACKBONE_COLORS.community}
          icon="shield"
          iconLabel="Shield icon representing the community"
          label="COMMUNITY (CPA)"
          sublabel="Owns Roads, Free Spaces, Slopes, Dam, Common Areas"
          tooltip="Once the CPA is registered, the community independently owns the shared areas — roads, free spaces, slopes, the dam and common areas."
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3" aria-label="Diagram colour legend">
        {[
          [BACKBONE_COLORS.brain, "Brain – Trust"],
          [BACKBONE_COLORS.spine, "Spinal cord"],
          [BACKBONE_COLORS.investor, "Investor"],
          [BACKBONE_COLORS.customer, "Customer"],
          [BACKBONE_COLORS.community, "Community (CPA)"],
        ].map(([color, label]) => (
          <span key={label} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SideCard({ color, title, badge, brings, gets, notGets }) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-lg" style={{ backgroundColor: color }}>
      <p className="font-extrabold tracking-wide">{title}</p>
      <span className="mt-1 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide">{badge}</span>
      <p className="mt-4 text-sm font-semibold">Brings: {brings}</p>
      <p className="mt-3 text-sm font-semibold">Gets:</p>
      <ul className="mt-1 space-y-1 text-sm text-white/90">
        {gets.map((g) => (
          <li key={g}>• {g}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold">Does NOT get:</p>
      <ul className="mt-1 space-y-1 text-sm text-white/90">
        {notGets.map((g) => (
          <li key={g}>• {g}</li>
        ))}
      </ul>
    </div>
  );
}

function BrainBox({ title, bullets }) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-lg" style={{ backgroundColor: BACKBONE_COLORS.brain }}>
      <p className="font-extrabold tracking-wide">THE BRAIN</p>
      <p className="mt-0.5 text-sm text-white/85">{title}</p>
      <ul className="mt-3 space-y-1 text-sm text-white/90">
        {bullets.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>
    </div>
  );
}

export function ExampleFlow({ brainTitle, brainBullets, investor, customer, community }) {
  return (
    <div className="relative mx-auto max-w-3xl">
      <FlowDefs />

      <div className="mx-auto max-w-md">
        <BrainBox title={brainTitle} bullets={brainBullets} />
      </div>

      <VertFlow />

      <div className="mx-auto max-w-md">
        <div className="rounded-2xl p-5 text-white shadow-lg" style={{ backgroundColor: BACKBONE_COLORS.spine }}>
          <p className="font-extrabold tracking-wide">THE SPINAL CORD</p>
          <p className="mt-0.5 text-sm text-white/85">Routes signals based on contract</p>
        </div>
      </div>

      <BranchFlow />
      <VertFlow className="md:hidden" />

      <div className="grid gap-4 md:grid-cols-2 md:gap-10">
        <SideCard color={BACKBONE_COLORS.investor} title="INVESTOR" badge="Contract A" {...investor} />
        <VertFlow className="md:hidden" />
        <SideCard color={BACKBONE_COLORS.customer} title="CUSTOMER" badge="Contract B" {...customer} />
      </div>

      {community && (
        <>
          <VertFlow />
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl p-5 text-white shadow-lg" style={{ backgroundColor: BACKBONE_COLORS.community }}>
              <p className="font-extrabold tracking-wide">COMMUNITY (CPA)</p>
              <p className="mt-3 text-sm font-semibold">Owns:</p>
              <ul className="mt-1 space-y-1 text-sm text-white/90">
                {community.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-white/90">Community has full independent ownership.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
