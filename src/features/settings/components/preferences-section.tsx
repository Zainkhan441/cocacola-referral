"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/features/auth/context/auth-provider";
import {
  updateNotificationPreferenceAction,
  updateThemePreferenceAction,
  updateLanguagePreferenceAction,
} from "@/features/settings/lib/actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { UserDoc } from "@/lib/firestore/users";

type PreferencesSectionProps = {
  profile: UserDoc;
};

export function PreferencesSection({ profile }: PreferencesSectionProps) {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabledState] = useState(profile.notificationsEnabled);
  const [themePreference, setThemePreferenceState] = useState(profile.themePreference);
  const [languagePreference, setLanguagePreferenceState] = useState(profile.languagePreference);
  const [error, setError] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);

  async function handleNotificationsToggle(enabled: boolean) {
    if (!user) return;
    setError(null);
    setNotificationsEnabledState(enabled);
    try {
      await updateNotificationPreferenceAction(user.uid, enabled);
      setSavedField("notifications");
      setTimeout(() => setSavedField(null), 1500);
    } catch (err) {
      setNotificationsEnabledState(!enabled);
      setError(getAuthErrorMessage(err));
    }
  }

  async function handleThemeChange(theme: UserDoc["themePreference"]) {
    if (!user) return;
    setError(null);
    const previous = themePreference;
    setThemePreferenceState(theme);
    try {
      await updateThemePreferenceAction(user.uid, theme);
      setSavedField("theme");
      setTimeout(() => setSavedField(null), 1500);
    } catch (err) {
      setThemePreferenceState(previous);
      setError(getAuthErrorMessage(err));
    }
  }

  async function handleLanguageChange(language: UserDoc["languagePreference"]) {
    if (!user) return;
    setError(null);
    const previous = languagePreference;
    setLanguagePreferenceState(language);
    try {
      await updateLanguagePreferenceAction(user.uid, language);
      setSavedField("language");
      setTimeout(() => setSavedField(null), 1500);
    } catch (err) {
      setLanguagePreferenceState(previous);
      setError(getAuthErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-white">Preferences</h2>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white/80">Notifications</p>
          <p className="text-xs text-white/40">Receive notifications sent by the platform.</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(event) => handleNotificationsToggle(event.target.checked)}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full bg-white/10 transition-colors peer-checked:bg-brand" />
          <div className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
        </label>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-4">
        <label className="text-sm font-medium text-white/80">
          Theme{" "}
          {savedField === "theme" && <span className="text-xs text-emerald-400">Saved</span>}
        </label>
        <select
          value={themePreference}
          onChange={(event) => handleThemeChange(event.target.value as UserDoc["themePreference"])}
          className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
        <p className="text-xs text-white/40">
          Your preference is saved. The app currently only renders in this premium dark theme — a
          full light theme is planned for a future update.
        </p>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-4">
        <label className="text-sm font-medium text-white/80">
          Language{" "}
          {savedField === "language" && <span className="text-xs text-emerald-400">Saved</span>}
        </label>
        <select
          value={languagePreference}
          onChange={(event) => handleLanguageChange(event.target.value as UserDoc["languagePreference"])}
          className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        >
          <option value="en">English</option>
          <option value="ur">اردو (Urdu)</option>
        </select>
        <p className="text-xs text-white/40">
          Your preference is saved. Full app translation isn’t available yet — the interface stays in
          English for now.
        </p>
      </div>

      {savedField === "notifications" && (
        <p className="text-xs text-emerald-400">Preference saved.</p>
      )}
    </div>
  );
}
