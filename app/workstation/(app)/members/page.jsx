"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useFetch, PageHeader, LoadingBlock, ErrorBlock, ConfirmButton } from "@/components/ws/common";
import { usePermissions, ReadOnlyNote } from "@/components/ws/permissions";
import { Modal, Field, StatusPill, Alert } from "@/components/ui";
import { zar, dateFmt } from "@/lib/format";

const EMPTY = { fullName: "", idNumber: "", dateOfBirth: "", gender: "", maritalStatus: "", physicalAddress: "", postalAddress: "", phone: "", email: "", plotNumber: "", purchasePrice: "", paymentPlan: "", beneficiaries: "" };

export default function MembersPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading members…" />}>
      <MembersInner />
    </Suspense>
  );
}

function MembersInner() {
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canManage = can("members:manage");
  const { data: members, loading, error, reload } = useFetch("/api/members");
  const { data: plots } = useFetch("/api/plots");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [addOpen, setAddOpen] = useState(canManage && searchParams.get("new") === "1");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const filtered = useMemo(() => {
    if (!members) return [];
    let list = members;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((m) => [m.fullName, m.email, m.phone, m.idNumber, (m.plots || []).map((p) => p.number).join(" ")].some((v) => (v || "").toLowerCase().includes(s)));
    }
    if (statusFilter !== "ALL") list = list.filter((m) => m.paymentStatus === statusFilter);
    return list;
  }, [members, q, statusFilter]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const plot = form.plotNumber && plots ? plots.find((p) => p.number === form.plotNumber) : null;
      await api.post("/api/members", { ...form, plotId: plot?.id ?? null });
      setAddOpen(false);
      setForm(EMPTY);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    if (!filtered.length) return;
    const headers = ["Name", "ID Number", "Email", "Phone", "Plot", "Price", "Paid", "Balance", "Status"];
    const rows = filtered.map((m) => [m.fullName, m.idNumber || "", m.email, m.phone, (m.plots || []).map((p) => p.number).join("; "), m.price ?? "", m.totalPaid, m.outstandingBalance, m.paymentStatus]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mheza-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !members) return <LoadingBlock label="Loading members…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div>
      <PageHeader
        title="Member Management"
        subtitle={`${members.length} members · search, filter, add, and manage plot holders`}
        actions={
          <>
            <button className="btn-outline btn-sm" onClick={exportCsv}>Export CSV</button>
            {canManage && <button className="btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Add Member</button>}
          </>
        }
      />

      {!canManage && <div className="mb-4"><ReadOnlyNote label="member records" /></div>}

      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input className="input max-w-xs" placeholder="Search name, email, phone, ID or plot…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
        <select className="input max-w-52" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by payment status">
          {["ALL", "PAID", "PARTIAL", "OUTSTANDING", "NONE"].map((s) => <option key={s} value={s}>{s === "ALL" ? "All payment statuses" : s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
        <span className="text-sm text-gray-500 ml-auto">{filtered.length} result(s)</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th><th>ID Number</th><th>Plot</th><th>Contact</th><th>Price</th><th>Paid</th><th>Balance</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td><Link href={`/workstation/members/${m.id}`} className="font-semibold text-forest-700 hover:underline">{m.fullName}</Link></td>
                <td className="font-mono text-xs text-gray-500">{m.idNumber || "-"}</td>
                <td>{m.plots?.length ? m.plots.map((p) => p.number).join(", ") : "-"}</td>
                <td className="text-xs text-gray-600">{m.phone}<br />{m.email}</td>
                <td className="whitespace-nowrap">{zar(m.price ?? 0)}</td>
                <td className="whitespace-nowrap text-forest-700">{zar(m.totalPaid)}</td>
                <td className={`whitespace-nowrap font-semibold ${m.outstandingBalance > 0 ? "text-red-600" : "text-gray-400"}`}>{zar(m.outstandingBalance)}</td>
                <td><StatusPill status={m.paymentStatus} /></td>
                <td className="whitespace-nowrap">
                  <Link href={`/workstation/members/${m.id}`} className="btn-ghost btn-sm">View</Link>
                  {canManage && (
                    <ConfirmButton
                      label="Delete"
                      className="btn-ghost btn-sm text-red-600"
                      confirmText={`Delete member ${m.fullName}? Their payments and document records will also be removed.`}
                      onConfirm={async () => { await api.del(`/api/members/${m.id}`); reload(); }}
                    />
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center text-gray-500 py-10">No members match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add member modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Member" wide>
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required className="sm:col-span-2"><input className="input" required value={form.fullName} onChange={set("fullName")} /></Field>
          <Field label="ID Number"><input className="input" value={form.idNumber} onChange={set("idNumber")} /></Field>
          <Field label="Date of Birth"><input className="input" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} /></Field>
          <Field label="Gender">
            <select className="input" value={form.gender} onChange={set("gender")}>
              <option value="">-</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
          <Field label="Marital Status">
            <select className="input" value={form.maritalStatus} onChange={set("maritalStatus")}>
              <option value="">-</option><option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option>
            </select>
          </Field>
          <Field label="Physical Address"><input className="input" value={form.physicalAddress} onChange={set("physicalAddress")} /></Field>
          <Field label="Postal Address"><input className="input" value={form.postalAddress} onChange={set("postalAddress")} /></Field>
          <Field label="Contact Number" required><input className="input" required value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Email Address" required><input className="input" type="email" required value={form.email} onChange={set("email")} /></Field>
          <Field label="Plot Number">
            <select className="input" value={form.plotNumber} onChange={set("plotNumber")}>
              <option value="">- No plot assigned -</option>
              {plots?.filter((p) => p.status === "AVAILABLE").map((p) => <option key={p.id} value={p.number}>Plot {p.number} (Block {p.block})</option>)}
            </select>
          </Field>
          <Field label="Purchase Price"><input className="input" type="number" min="0" value={form.purchasePrice} onChange={set("purchasePrice")} placeholder="75000" /></Field>
          <Field label="Payment Plan">
            <select className="input" value={form.paymentPlan} onChange={set("paymentPlan")}>
              <option value="">-</option><option value="FULL">Full payment</option><option value="PLAN_6">6 months</option><option value="PLAN_12">12 months</option><option value="PLAN_24">24 months</option>
            </select>
          </Field>
          <Field label="Beneficiary (name, relation)" className="sm:col-span-2">
            <input className="input" value={form.beneficiaries} onChange={set("beneficiaries")} placeholder="e.g. Nomvula Mheza, Child" />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Member"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
