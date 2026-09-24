"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui";

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// Fetch-on-mount hook with refresh capability
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(url);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => { load(); }, [load]);

  return { data, error, loading, reload: load, setData };
}

export function LoadingBlock({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBlock({ message }) {
  return <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{message}</div>;
}

export function ConfirmButton({ onConfirm, label = "Delete", className = "btn-danger btn-sm", confirmText = "Are you sure?" }) {
  return (
    <button
      className={className}
      onClick={async () => {
        if (window.confirm(confirmText)) await onConfirm();
      }}
    >
      {label}
    </button>
  );
}
