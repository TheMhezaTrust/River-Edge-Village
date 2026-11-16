"use client";

import { useEffect, useState } from "react";

const DEFAULT_DURATION_MS = 3000;
const MIN_DURATION_MS = 500;

// Only a real http(s) destination becomes a link; anything else renders as a
// plain banner rather than an unusable or unsafe href.
function destination(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

export default function AdRotator({ ads }) {
  const [index, setIndex] = useState(0);
  const rotating = ads.length > 1;

  // Each advertisement carries its own display duration from the Ad Manager, so
  // the pause before the next slide is the one belonging to the ad on screen.
  useEffect(() => {
    if (!rotating) return undefined;
    const ms = Math.max(MIN_DURATION_MS, Number(ads[index]?.displayDurationMs) || DEFAULT_DURATION_MS);
    const timer = setTimeout(() => setIndex((i) => (i + 1) % ads.length), ms);
    return () => clearTimeout(timer);
  }, [index, ads, rotating]);

  const ad = ads[index] || ads[0];
  if (!ad) return null;
  const link = destination(ad.destinationUrl);

  const creative = (
    <>
      {ad.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.imageUrl}
          alt=""
          loading="lazy"
          className="h-10 w-16 shrink-0 rounded-md object-cover sm:h-12 sm:w-20"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-forest-900">{ad.companyName}</span>
        {link && <span className="block truncate text-xs text-gray-500">{link.host}</span>}
      </span>
    </>
  );

  return (
    <section aria-label="Advertisements" className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2.5">
        <p className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:block">
          Advertisement
        </p>

        {link ? (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-white"
          >
            {creative}
          </a>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3 px-2 py-1">{creative}</div>
        )}

        {rotating && (
          <div className="flex shrink-0 items-center gap-1.5">
            {ads.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show advertisement ${i + 1} of ${ads.length}`}
                aria-current={i === index}
                className={`h-1.5 w-1.5 cursor-pointer rounded-full transition-colors ${
                  i === index ? "bg-forest-600" : "bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
