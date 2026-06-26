"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Trash2, FileStack } from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { RequireAdmin } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { EXAM_TYPES, formatDateTime } from "@/lib/utils";
import type { DocumentRecord } from "@/lib/types";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  Badge,
  LoadingBlock,
  ErrorAlert,
  SuccessAlert,
  EmptyState,
} from "@/components/ui";

const KIND_OPTIONS = ["syllabus", "past_paper", "notes", "textbook"];

type BadgeColor = "green" | "blue" | "amber" | "red" | "gray";

function statusColor(status: string): BadgeColor {
  switch (status) {
    case "indexed":
      return "green";
    case "processing":
      return "amber";
    case "uploaded":
      return "blue";
    case "failed":
      return "red";
    default:
      return "gray";
  }
}

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);

  // upload form state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<string>(KIND_OPTIONS[0]);
  const [testType, setTestType] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await api.get<DocumentRecord[]>("/documents");
      setDocs(data ?? []);
    } catch (e) {
      setListError(
        e instanceof ApiError ? e.message : "Failed to load documents."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const resetForm = () => {
    setFile(null);
    setKind(KIND_OPTIONS[0]);
    setTestType("");
    setSubjectId("");
    setSource("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);
    if (!file) {
      setUploadError("Please choose a file to upload.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      if (testType) fd.append("test_type", testType);
      if (subjectId.trim()) fd.append("subject_id", subjectId.trim());
      if (source.trim()) fd.append("source", source.trim());
      await api.upload("/documents/upload", fd);
      setUploadSuccess("Document uploaded successfully.");
      resetForm();
      await loadDocs();
    } catch (e) {
      setUploadError(
        e instanceof ApiError ? e.message : "Failed to upload document."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setListError(null);
    try {
      await api.del(`/documents/${id}`);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setListError(
        e instanceof ApiError ? e.message : "Failed to delete document."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell>
      <RequireAdmin>
        <PageHeader
          title="Documents"
          description="Upload source material for indexing and RAG."
        />

        <div className="space-y-6">
          {/* Upload form */}
          <Card>
            <CardHeader title="Upload document" />
            <CardBody>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-slate-300 dark:file:bg-brand-500/15 dark:file:text-brand-300 dark:hover:file:bg-brand-500/25"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select
                    label="Kind"
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    {KIND_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Test type (optional)"
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                  >
                    <option value="">— None —</option>
                    {EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Subject ID (optional)"
                    placeholder="Subject identifier"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                  />
                  <Input
                    label="Source"
                    placeholder="e.g. Official syllabus 2024"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                </div>

                {uploadError && <ErrorAlert message={uploadError} />}
                {uploadSuccess && <SuccessAlert message={uploadSuccess} />}

                <Button type="submit" loading={uploading} disabled={!file}>
                  <Upload className="h-4 w-4" /> Upload
                </Button>
              </form>
            </CardBody>
          </Card>

          {/* Documents list */}
          <Card>
            <CardHeader title="Documents" />
            <CardBody className="p-0">
              {listError && (
                <div className="p-5">
                  <ErrorAlert message={listError} />
                </div>
              )}
              {loading ? (
                <LoadingBlock label="Loading documents…" />
              ) : docs.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={FileStack}
                    title="No documents yet"
                    description="Upload a document to get started."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-ink-800 dark:text-slate-400">
                        <th className="p-4 font-medium">Filename</th>
                        <th className="p-4 font-medium">Kind</th>
                        <th className="p-4 font-medium">Test type</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Created</th>
                        <th className="p-4 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-ink-800">
                      {docs.map((d) => (
                        <tr key={d.id} className="text-slate-700 dark:text-slate-200">
                          <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                            {d.filename}
                          </td>
                          <td className="p-4">
                            <Badge color="gray">{d.kind}</Badge>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {d.test_type || "—"}
                          </td>
                          <td className="p-4">
                            <Badge color={statusColor(d.status)}>
                              {d.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-slate-500 dark:text-slate-400">
                            {formatDateTime(d.created_at)}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              size="sm"
                              variant="danger"
                              loading={deletingId === d.id}
                              disabled={deletingId === d.id}
                              onClick={() => handleDelete(d.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </RequireAdmin>
    </AppShell>
  );
}
