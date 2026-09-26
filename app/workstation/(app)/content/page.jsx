"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock } from "@/components/ws/common";
import { Field, Alert } from "@/components/ui";
import PasswordConfirmModal from "@/components/ws/PasswordConfirmModal";

export default function ContentPage() {
  const { data, loading, error, reload } = useFetch("/api/content");
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const groups = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    for (const f of data.fields) {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group).push(f);
    }
    return [...map.entries()];
  }, [data]);

  const valueOf = (f) => values?.[f.key] ?? data?.values?.[f.key] ?? f.default;

  const dirty = useMemo(() => {
    if (!data) return false;
    return data.fields.some((f) => valueOf(f) !== (data.values[f.key] ?? f.default));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, values]);

  const setKey = (key) => (e) => setValues((v) => ({ ...(v || {}), [key]: e.target.value }));

  function openSave() {
    setMsg(null);
    setSaveError(null);
    setConfirmOpen(true);
  }

  async function doSave(confirmToken) {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {};
      for (const f of data.fields) payload[f.key] = valueOf(f);
      await api.put("/api/content", { values: payload, confirmToken });
      setValues(null);
      setMsg("Site content updated. The public pages now reflect your changes.");
      reload();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  if (loading && !data) return <LoadingBlock label="Loading site content…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <PageHeader
        title="Website Content"
        subtitle="Edit the wording on the public Homepage, About Us and Projects pages — no code changes needed."
        actions={
          <button className="btn-primary btn-sm" onClick={openSave} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        }
      />

      {msg && <div className="mb-4"><Alert type="success">{msg}</Alert></div>}
      {saveError && <div className="mb-4"><Alert type="error">{saveError}</Alert></div>}
      {!dirty && <p className="text-xs text-gray-500 mb-4">Changes are saved only when you press Save Changes and confirm your password.</p>}

      <div className="space-y-8">
        {groups.map(([group, fields]) => (
          <section key={group}>
            <h2 className="text-lg font-bold text-forest-900 mb-3">{group}</h2>
            <div className="grid gap-4">
              {fields.map((f) => (
                <div key={f.key} className="card p-4">
                  <Field label={f.label}>
                    {f.multiline ? (
                      <textarea className="input min-h-[80px]" rows={3} value={valueOf(f)} onChange={setKey(f.key)} />
                    ) : (
                      <input className="input" value={valueOf(f)} onChange={setKey(f.key)} />
                    )}
                  </Field>
                  {f.help && <p className="mt-1.5 text-xs text-gray-500">{f.help}</p>}
                  <p className="mt-1 text-[11px] font-mono text-gray-400">{f.key}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button className="btn-primary" onClick={openSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <PasswordConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirmed={doSave}
        title="Confirm content update"
        description="Updating public website content is a sensitive action. Re-enter your password to publish these changes."
      />
    </div>
  );
}
