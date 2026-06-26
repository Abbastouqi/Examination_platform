"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { RequireAdmin } from "@/lib/auth";
import { api, ApiError, API_BASE, getAccessToken } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { AdminPayment, PaymentStatus } from "@/lib/types";
import {
  Card,
  CardBody,
  Button,
  Badge,
  LoadingBlock,
  ErrorAlert,
  SuccessAlert,
  EmptyState,
  Modal,
  Spinner,
} from "@/components/ui";

type StatusFilter = PaymentStatus | "all";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function statusBadgeColor(status: PaymentStatus): "green" | "amber" | "red" {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "amber";
}

export default function AdminPaymentsPage() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // proof viewer
  const [proofOpen, setProofOpen] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofIsPdf, setProofIsPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const data = await api.get<AdminPayment[]>(`/admin/payments${qs}`);
      setPayments(data ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  function closeProof() {
    setProofOpen(false);
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setProofUrl(null);
    setProofIsPdf(false);
    setProofError(null);
  }

  // clean up any object URL on unmount
  useEffect(() => {
    return () => {
      if (proofUrl) URL.revokeObjectURL(proofUrl);
    };
  }, [proofUrl]);

  async function viewProof(p: AdminPayment) {
    setProofOpen(true);
    setProofLoading(true);
    setProofError(null);
    setProofUrl(null);
    setProofIsPdf(false);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/payments/${p.id}/proof`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error("Could not load proof.");
      }
      const blob = await res.blob();
      setProofIsPdf(blob.type === "application/pdf");
      setProofUrl(URL.createObjectURL(blob));
    } catch {
      setProofError("Could not load proof.");
    } finally {
      setProofLoading(false);
    }
  }

  async function approve(p: AdminPayment) {
    setBusyId(p.id);
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/admin/payments/${p.id}/approve`);
      setSuccess(`Approved payment from ${p.user_email}.`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to approve payment.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(p: AdminPayment) {
    const reason = window.prompt(
      "Reason for rejection (optional):",
      ""
    );
    // window.prompt returns null when cancelled
    if (reason === null) return;
    setBusyId(p.id);
    setError(null);
    setSuccess(null);
    try {
      const qs = reason.trim()
        ? `?reason=${encodeURIComponent(reason.trim())}`
        : "";
      await api.post(`/admin/payments/${p.id}/reject${qs}`);
      setSuccess(`Rejected payment from ${p.user_email}.`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to reject payment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell>
      <RequireAdmin>
        <PageHeader
          title="Payments"
          description="Review and approve manual payment submissions."
        />

        {/* Status filter tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "primary" : "outline"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {success && (
          <div className="mb-4">
            <SuccessAlert message={success} />
          </div>
        )}
        {error && (
          <div className="mb-4">
            <ErrorAlert message={error} />
          </div>
        )}

        {loading ? (
          <LoadingBlock label="Loading payments…" />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments found"
            description="There are no payments matching this filter."
          />
        ) : (
          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <th className="p-4 font-medium">User</th>
                      <th className="p-4 font-medium">Plan</th>
                      <th className="p-4 font-medium">Amount</th>
                      <th className="p-4 font-medium">Provider</th>
                      <th className="p-4 font-medium">Sender</th>
                      <th className="p-4 font-medium">Ref</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payments.map((p) => {
                      const busy = busyId === p.id;
                      const decided = p.status !== "pending";
                      return (
                        <tr key={p.id} className="align-top text-slate-700">
                          <td className="p-4 font-medium text-slate-900">
                            {p.user_email}
                          </td>
                          <td className="p-4 capitalize text-slate-700">
                            {p.plan}
                          </td>
                          <td className="p-4 font-medium text-slate-900">
                            PKR {p.amount.toLocaleString()}
                          </td>
                          <td className="p-4 capitalize text-slate-600">
                            {p.provider}
                          </td>
                          <td className="p-4 text-slate-600">
                            <div>{p.sender_name || "—"}</div>
                            {p.sender_number && (
                              <div className="text-xs text-slate-400">
                                {p.sender_number}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-slate-600">
                            {p.transaction_ref || "—"}
                          </td>
                          <td className="p-4 text-slate-500">
                            {formatDateTime(p.created_at)}
                          </td>
                          <td className="p-4">
                            <Badge color={statusBadgeColor(p.status)}>
                              {p.status}
                            </Badge>
                            {p.status === "rejected" && p.reject_reason && (
                              <p className="mt-1 max-w-[12rem] text-xs text-red-600">
                                {p.reject_reason}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewProof(p)}
                              >
                                View proof
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={busy}
                                disabled={busy || decided}
                                onClick={() => approve(p)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                loading={busy}
                                disabled={busy || decided}
                                onClick={() => reject(p)}
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Proof viewer modal */}
        <Modal
          open={proofOpen}
          onClose={closeProof}
          title="Payment proof"
          size="lg"
        >
          {proofLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : proofError ? (
            <ErrorAlert message={proofError} />
          ) : proofUrl ? (
            proofIsPdf ? (
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Open PDF in new tab
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proofUrl}
                alt="Payment proof"
                className="mx-auto max-h-[70vh] w-auto rounded-lg"
              />
            )
          ) : null}
        </Modal>
      </RequireAdmin>
    </AppShell>
  );
}
