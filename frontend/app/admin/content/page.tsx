"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, FolderOpen, Tag } from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { RequireAdmin } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { EXAM_TYPES, cn } from "@/lib/utils";
import type { Subject, Topic } from "@/lib/types";
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
  EmptyState,
  Modal,
} from "@/components/ui";

export default function AdminContentPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Subject | null>(null);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState<boolean>(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  // add subject form
  const [newSubjectName, setNewSubjectName] = useState<string>("");
  const [newSubjectType, setNewSubjectType] = useState<string>("");
  const [addingSubject, setAddingSubject] = useState<boolean>(false);

  // add topic form
  const [newTopicName, setNewTopicName] = useState<string>("");
  const [addingTopic, setAddingTopic] = useState<boolean>(false);

  // edit subject modal
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editType, setEditType] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // delete subject modal
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<boolean>(false);

  const loadSubjects = useCallback(async () => {
    setSubjectsLoading(true);
    setSubjectsError(null);
    try {
      const data = await api.get<Subject[]>("/admin/subjects");
      setSubjects(data ?? []);
    } catch (e) {
      setSubjectsError(
        e instanceof ApiError ? e.message : "Failed to load subjects."
      );
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  const loadTopics = useCallback(async (subjectId: string) => {
    setTopicsLoading(true);
    setTopicsError(null);
    try {
      const data = await api.get<Topic[]>(
        `/admin/topics?subject_id=${encodeURIComponent(subjectId)}`
      );
      setTopics(data ?? []);
    } catch (e) {
      setTopicsError(
        e instanceof ApiError ? e.message : "Failed to load topics."
      );
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    if (selected) loadTopics(selected.id);
    else setTopics([]);
  }, [selected, loadTopics]);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setAddingSubject(true);
    setSubjectsError(null);
    try {
      const body: { name: string; test_type?: string } = {
        name: newSubjectName.trim(),
      };
      if (newSubjectType) body.test_type = newSubjectType;
      const created = await api.post<Subject>("/admin/subjects", body);
      setSubjects((prev) => [...prev, created]);
      setNewSubjectName("");
      setNewSubjectType("");
    } catch (e) {
      setSubjectsError(
        e instanceof ApiError ? e.message : "Failed to add subject."
      );
    } finally {
      setAddingSubject(false);
    }
  };

  const openEdit = (s: Subject) => {
    setEditSubject(s);
    setEditName(s.name);
    setEditType(s.test_type ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editSubject || !editName.trim()) return;
    setSavingEdit(true);
    setSubjectsError(null);
    try {
      const updated = await api.patch<Subject>(
        `/admin/subjects/${editSubject.id}`,
        { name: editName.trim(), test_type: editType || undefined }
      );
      setSubjects((prev) =>
        prev.map((s) => (s.id === editSubject.id ? { ...s, ...updated } : s))
      );
      if (selected?.id === editSubject.id)
        setSelected((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditSubject(null);
    } catch (e) {
      setSubjectsError(
        e instanceof ApiError ? e.message : "Failed to update subject."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteSubject) return;
    setDeletingSubject(true);
    setSubjectsError(null);
    try {
      await api.del(`/admin/subjects/${deleteSubject.id}`);
      setSubjects((prev) => prev.filter((s) => s.id !== deleteSubject.id));
      if (selected?.id === deleteSubject.id) setSelected(null);
      setDeleteSubject(null);
    } catch (e) {
      setSubjectsError(
        e instanceof ApiError ? e.message : "Failed to delete subject."
      );
    } finally {
      setDeletingSubject(false);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !newTopicName.trim()) return;
    setAddingTopic(true);
    setTopicsError(null);
    try {
      const created = await api.post<Topic>("/admin/topics", {
        subject_id: selected.id,
        name: newTopicName.trim(),
      });
      setTopics((prev) => [...prev, created]);
      setNewTopicName("");
    } catch (e) {
      setTopicsError(
        e instanceof ApiError ? e.message : "Failed to add topic."
      );
    } finally {
      setAddingTopic(false);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    setTopicsError(null);
    try {
      await api.del(`/admin/topics/${id}`);
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setTopicsError(
        e instanceof ApiError ? e.message : "Failed to delete topic."
      );
    }
  };

  return (
    <AppShell>
      <RequireAdmin>
        <PageHeader
          title="Content"
          description="Manage subjects and their topics."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Subjects */}
          <Card>
            <CardHeader title="Subjects" subtitle="Select a subject to manage its topics" />
            <CardBody className="space-y-4">
              <form onSubmit={handleAddSubject} className="space-y-3">
                <Input
                  label="Subject name"
                  placeholder="e.g. General Knowledge"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                />
                <Select
                  label="Test type (optional)"
                  value={newSubjectType}
                  onChange={(e) => setNewSubjectType(e.target.value)}
                >
                  <option value="">— None —</option>
                  {EXAM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Button
                  type="submit"
                  loading={addingSubject}
                  disabled={!newSubjectName.trim()}
                >
                  <Plus className="h-4 w-4" /> Add subject
                </Button>
              </form>

              {subjectsError && <ErrorAlert message={subjectsError} />}

              {subjectsLoading ? (
                <LoadingBlock label="Loading subjects…" />
              ) : subjects.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No subjects yet"
                  description="Add a subject to get started."
                />
              ) : (
                <ul className="space-y-2">
                  {subjects.map((s) => (
                    <li
                      key={s.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors",
                        selected?.id === s.id
                          ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/15"
                          : "border-slate-200 hover:bg-slate-50 dark:border-ink-800 dark:hover:bg-ink-800"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelected(s)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {s.name}
                        </span>
                        {s.test_type && (
                          <Badge color="brand">{s.test_type}</Badge>
                        )}
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(s)}
                          aria-label="Edit subject"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteSubject(s)}
                          aria-label="Delete subject"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Topics */}
          <Card>
            <CardHeader
              title="Topics"
              subtitle={
                selected ? `For: ${selected.name}` : "Select a subject first"
              }
            />
            <CardBody className="space-y-4">
              {!selected ? (
                <EmptyState
                  icon={Tag}
                  title="No subject selected"
                  description="Choose a subject on the left to view and manage its topics."
                />
              ) : (
                <>
                  <form onSubmit={handleAddTopic} className="flex items-end gap-3">
                    <div className="flex-1">
                      <Input
                        label="Topic name"
                        placeholder="e.g. Current Affairs"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                      />
                    </div>
                    <Button
                      type="submit"
                      loading={addingTopic}
                      disabled={!newTopicName.trim()}
                    >
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </form>

                  {topicsError && <ErrorAlert message={topicsError} />}

                  {topicsLoading ? (
                    <LoadingBlock label="Loading topics…" />
                  ) : topics.length === 0 ? (
                    <EmptyState
                      icon={Tag}
                      title="No topics yet"
                      description="Add a topic for this subject."
                    />
                  ) : (
                    <ul className="space-y-2">
                      {topics.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-ink-800"
                        >
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {t.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTopic(t.id)}
                            aria-label="Delete topic"
                          >
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Edit subject modal */}
        <Modal
          open={!!editSubject}
          onClose={() => setEditSubject(null)}
          title="Edit subject"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setEditSubject(null)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                loading={savingEdit}
                disabled={!editName.trim()}
                onClick={handleSaveEdit}
              >
                Save
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input
              label="Subject name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Select
              label="Test type"
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
            >
              <option value="">— None —</option>
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </Modal>

        {/* Delete subject modal */}
        <Modal
          open={!!deleteSubject}
          onClose={() => setDeleteSubject(null)}
          title="Delete subject"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setDeleteSubject(null)}
                disabled={deletingSubject}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deletingSubject}
                onClick={handleDeleteSubject}
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Delete{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {deleteSubject?.name}
            </span>{" "}
            and its topics? This cannot be undone.
          </p>
        </Modal>
      </RequireAdmin>
    </AppShell>
  );
}
