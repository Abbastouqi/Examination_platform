"use client";

import { useEffect, useState } from "react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { cn, EXAM_TYPES } from "@/lib/utils";
import type { User } from "@/lib/types";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Badge,
  LoadingBlock,
  ErrorAlert,
  SuccessAlert,
} from "@/components/ui";

export default function ProfilePage() {
  const { user, setUser, refreshUser } = useAuth();

  // profile form
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [targetExams, setTargetExams] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // prefill from user once available
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setAvatarUrl(user.avatar_url || "");
      setTargetExams(user.target_exams || []);
    }
  }, [user]);

  function toggleExam(exam: string) {
    setTargetExams((prev) =>
      prev.includes(exam)
        ? prev.filter((e) => e !== exam)
        : [...prev, exam]
    );
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const updated = await api.patch<User>("/users/me", {
        full_name: fullName,
        target_exams: targetExams,
        avatar_url: avatarUrl || null,
      });
      setUser(updated);
      await refreshUser();
      setProfileSuccess("Profile updated successfully.");
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : "Something went wrong"
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await api.post("/users/me/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccess("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof ApiError ? err.message : "Something went wrong"
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (!user) {
    return (
      <AppShell>
        <LoadingBlock label="Loading profile…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Profile"
        description="Manage your account details and security."
      />

      <div className="space-y-6">
        {/* Account info (read-only) */}
        <Card>
          <CardHeader title="Account" subtitle="Your account identity." />
          <CardBody>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{user.email}</p>
              </div>
              <Badge color={user.role === "admin" ? "brand" : "gray"}>
                {user.role}
              </Badge>
            </div>
          </CardBody>
        </Card>

        {/* Profile form */}
        <Card>
          <CardHeader
            title="Profile details"
            subtitle="Update your name, avatar and target exams."
          />
          <CardBody>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <ErrorAlert message={profileError} />
              <SuccessAlert message={profileSuccess} />
              <Input
                label="Full name"
                name="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="Avatar URL (optional)"
                name="avatar_url"
                type="url"
                placeholder="https://…"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Target exams
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXAM_TYPES.map((exam) => {
                    const active = targetExams.includes(exam);
                    return (
                      <button
                        key={exam}
                        type="button"
                        onClick={() => toggleExam(exam)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                          active
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-ink-800 dark:bg-ink-900 dark:text-slate-400 dark:hover:bg-ink-800"
                        )}
                      >
                        {exam}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={savingProfile}>
                  Save changes
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader
            title="Change password"
            subtitle="Choose a strong password you don't use elsewhere."
          />
          <CardBody>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <ErrorAlert message={passwordError} />
              <SuccessAlert message={passwordSuccess} />
              <Input
                label="Current password"
                name="old_password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
              <Input
                label="New password"
                name="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm new password"
                name="confirm_password"
                type="password"
                error={
                  confirmPassword && confirmPassword !== newPassword
                    ? "Passwords do not match"
                    : undefined
                }
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div className="flex justify-end">
                <Button type="submit" loading={savingPassword}>
                  Update password
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
