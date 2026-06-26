"use client";

import { useEffect, useState } from "react";
import { Check, Copy, CreditCard, Receipt } from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type {
  Subscription,
  PaymentMethod,
  PaymentMethodsResponse,
  PaymentPlan,
  PaymentProvider,
  PaymentStatus,
  ManualPayment,
} from "@/lib/types";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Badge,
  Modal,
  LoadingBlock,
  ErrorAlert,
  SuccessAlert,
  EmptyState,
} from "@/components/ui";

const FREE_PLAN_KEYS = ["free", "basic"];

function statusBadgeColor(status: PaymentStatus): "green" | "amber" | "red" {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "amber";
}

// Small copy-to-clipboard button with a brief "Copied" state.
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/15"
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function BillingPage() {
  const [methodsData, setMethodsData] = useState<PaymentMethodsResponse | null>(
    null
  );
  const [sub, setSub] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<ManualPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // cancel flow
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // payment flow
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [provider, setProvider] = useState<PaymentProvider>("jazzcash");
  const [senderName, setSenderName] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [txnRef, setTxnRef] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    await Promise.all([
      (async () => {
        try {
          setMethodsData(
            await api.get<PaymentMethodsResponse>("/payments/methods")
          );
        } catch (e) {
          setError(e instanceof ApiError ? e.message : "Something went wrong");
        }
      })(),
      (async () => {
        try {
          setSub(await api.get<Subscription>("/subscriptions/me"));
        } catch {
          setSub(null);
        }
      })(),
      (async () => {
        try {
          setHistory(await api.get<ManualPayment[]>("/payments/history"));
        } catch {
          setHistory([]);
        }
      })(),
    ]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const currentPlanKey = sub?.plan;
  const isPaid =
    !!sub &&
    !!currentPlanKey &&
    (sub.status || "").toLowerCase() === "active" &&
    !FREE_PLAN_KEYS.includes(currentPlanKey.toLowerCase());

  const plans = methodsData?.plans ?? [];
  const methods = methodsData?.methods ?? [];
  const activeMethod: PaymentMethod | undefined = methods.find(
    (m) => m.provider === provider
  );

  function choosePlan(plan: PaymentPlan) {
    setSelectedPlan(plan);
    setPayError(null);
    setPaySuccess(null);
    // default provider to first available method
    if (methods.length > 0) setProvider(methods[0].provider);
  }

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      await api.post("/subscriptions/cancel");
      setCancelOpen(false);
      await loadAll();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setCancelling(false);
    }
  }

  async function handleSubmitProof(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!senderName.trim()) {
      setPayError("Please enter the sender name.");
      return;
    }
    if (!proofFile) {
      setPayError("Please attach a payment screenshot or receipt.");
      return;
    }
    setSubmitting(true);
    setPayError(null);
    setPaySuccess(null);
    try {
      const fd = new FormData();
      fd.append("plan", selectedPlan.id);
      fd.append("provider", provider);
      fd.append("sender_name", senderName.trim());
      fd.append("sender_number", senderNumber.trim());
      fd.append("transaction_ref", txnRef.trim());
      fd.append("proof", proofFile);
      await api.upload<ManualPayment>("/payments/manual", fd);
      setPaySuccess("Payment submitted — pending admin approval.");
      setSelectedPlan(null);
      setSenderName("");
      setSenderNumber("");
      setTxnRef("");
      setProofFile(null);
      try {
        setHistory(await api.get<ManualPayment[]>("/payments/history"));
      } catch {
        /* history refresh best-effort */
      }
    } catch (e) {
      setPayError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Billing"
        description="Manage your subscription, choose a plan and submit payments."
      />

      {loading ? (
        <LoadingBlock label="Loading billing…" />
      ) : (
        <div className="space-y-6">
          <ErrorAlert message={error} />

          {/* Current plan */}
          <Card>
            <CardHeader
              title="Current plan"
              subtitle="Your active subscription details."
            />
            <CardBody>
              {isPaid && sub ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {plans.find((p) => p.id === sub.plan)?.name || sub.plan}
                      </span>
                      <Badge color="green">Active</Badge>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Expires: {formatDate(sub.expires_at)}
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setCancelOpen(true)}>
                    Cancel subscription
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Free plan
                  </span>
                  <Badge color="gray">Free</Badge>
                </div>
              )}
            </CardBody>
          </Card>

          {paySuccess && <SuccessAlert message={paySuccess} />}

          {/* Plans */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Plans</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {plans.map((plan) => {
                const isCurrent = isPaid && plan.id === currentPlanKey;
                const isSelected = selectedPlan?.id === plan.id;
                return (
                  <Card
                    key={plan.id}
                    className={
                      isSelected
                        ? "ring-2 ring-brand-500"
                        : isCurrent
                        ? "ring-2 ring-accent-500"
                        : undefined
                    }
                  >
                    <CardBody className="flex h-full flex-col">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {plan.name}
                        </h3>
                        {isCurrent && <Badge color="accent">Current</Badge>}
                      </div>
                      <div className="mt-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          PKR {plan.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {" "}
                          / {plan.duration_days} days
                        </span>
                      </div>
                      <ul className="mt-4 flex-1 space-y-2">
                        {plan.features.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                          >
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-600" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5">
                        <Button
                          variant={isSelected ? "outline" : "primary"}
                          className="w-full"
                          onClick={() => choosePlan(plan)}
                        >
                          {isSelected ? "Selected" : "Choose plan"}
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
            {plans.length === 0 && (
              <EmptyState
                icon={CreditCard}
                title="No plans available"
                description="Plans could not be loaded right now."
              />
            )}
          </div>

          {/* Payment panel */}
          {selectedPlan && (
            <Card>
              <CardHeader
                title={`Pay for ${selectedPlan.name}`}
                subtitle={`Transfer PKR ${selectedPlan.price.toLocaleString()} and submit your payment proof for approval.`}
              />
              <CardBody className="space-y-6">
                {/* Account details to pay to */}
                {activeMethod && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-ink-800 dark:bg-ink-950">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Pay to {activeMethod.label}
                      </h4>
                      {methodsData?.account_name && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {methodsData.account_name}
                        </span>
                      )}
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-slate-500 dark:text-slate-400">Account title</dt>
                        <dd className="font-medium text-slate-900 dark:text-slate-100">
                          {activeMethod.account_title}
                        </dd>
                      </div>
                      {activeMethod.provider === "jazzcash" &&
                        activeMethod.number && (
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-slate-500 dark:text-slate-400">Number</dt>
                            <dd className="flex items-center gap-1 font-medium text-slate-900 dark:text-slate-100">
                              <span className="font-mono">
                                {activeMethod.number}
                              </span>
                              <CopyButton value={activeMethod.number} />
                            </dd>
                          </div>
                        )}
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-slate-500 dark:text-slate-400">IBAN</dt>
                        <dd className="flex items-center gap-1 font-medium text-slate-900 dark:text-slate-100">
                          <span className="font-mono">{activeMethod.iban}</span>
                          <CopyButton value={activeMethod.iban} />
                        </dd>
                      </div>
                    </dl>
                    {activeMethod.instructions && (
                      <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-ink-800 dark:text-slate-400">
                        {activeMethod.instructions}
                      </p>
                    )}
                  </div>
                )}

                {/* Proof submission form */}
                <form onSubmit={handleSubmitProof} className="space-y-4">
                  <div>
                    <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Payment method
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {methods.map((m) => (
                        <label
                          key={m.provider}
                          className={
                            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm " +
                            (provider === m.provider
                              ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-300"
                              : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-ink-800 dark:text-slate-300 dark:hover:bg-ink-800")
                          }
                        >
                          <input
                            type="radio"
                            name="provider"
                            value={m.provider}
                            checked={provider === m.provider}
                            onChange={() => setProvider(m.provider)}
                            className="accent-brand-600"
                          />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Sender name"
                      name="sender_name"
                      placeholder="Name on the sending account"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      required
                    />
                    <Input
                      label="Sender number"
                      name="sender_number"
                      placeholder="e.g. 03xx-xxxxxxx"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                    />
                  </div>

                  <Input
                    label="Transaction reference (optional)"
                    name="transaction_ref"
                    placeholder="Transaction ID / TID"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                  />

                  <div>
                    <label
                      htmlFor="proof"
                      className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Payment proof (screenshot or PDF)
                    </label>
                    <input
                      id="proof"
                      name="proof"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) =>
                        setProofFile(e.target.files?.[0] ?? null)
                      }
                      className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-slate-400 dark:file:bg-brand-500/15 dark:file:text-brand-300 dark:hover:file:bg-brand-500/25"
                    />
                  </div>

                  <ErrorAlert message={payError} />

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" loading={submitting}>
                      Submit payment
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={submitting}
                      onClick={() => {
                        setSelectedPlan(null);
                        setPayError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {/* Payment history */}
          <Card>
            <CardHeader
              title="Payment history"
              subtitle="Your submitted payments and their status."
            />
            <CardBody className="p-0">
              {history.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={Receipt}
                    title="No payments yet"
                    description="Your submitted payments will appear here."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-ink-800 dark:text-slate-400">
                        <th className="p-4 font-medium">Date</th>
                        <th className="p-4 font-medium">Plan</th>
                        <th className="p-4 font-medium">Amount</th>
                        <th className="p-4 font-medium">Provider</th>
                        <th className="p-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-ink-800">
                      {history.map((p) => (
                        <tr key={p.id} className="text-slate-700 dark:text-slate-200">
                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {formatDate(p.created_at)}
                          </td>
                          <td className="p-4 text-slate-700 dark:text-slate-200">
                            {plans.find((pl) => pl.id === p.plan)?.name ||
                              p.plan}
                          </td>
                          <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                            PKR {p.amount.toLocaleString()}
                          </td>
                          <td className="p-4 capitalize text-slate-600 dark:text-slate-400">
                            {p.provider}
                          </td>
                          <td className="p-4">
                            <Badge color={statusBadgeColor(p.status)}>
                              {p.status}
                            </Badge>
                            {p.status === "rejected" && p.reject_reason && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {p.reject_reason}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Cancel confirmation modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel subscription"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              Keep plan
            </Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancel}>
              Cancel subscription
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to cancel your subscription? You will keep access
          until the end of your current billing period.
        </p>
      </Modal>
    </AppShell>
  );
}
