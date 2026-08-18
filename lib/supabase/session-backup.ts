import type { Session } from "@supabase/supabase-js";

const SESSION_BACKUP_KEY = "tangent-auth-session-backup";

export function persistSessionBackup(session: Session | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(SESSION_BACKUP_KEY);
    return;
  }
  window.localStorage.setItem(
    SESSION_BACKUP_KEY,
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  );
}

export function readSessionBackup(): {
  access_token: string;
  refresh_token: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      refresh_token?: string;
    };
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
    };
  } catch {
    return null;
  }
}
