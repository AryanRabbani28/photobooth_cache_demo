/**
 * Credential storage, kept separate per surface.
 *
 * A kiosk tab, an operator tab, and an admin tab are three different principals in
 * §20.2 terms, and a demo is often run with all three open at once. Storing one shared
 * token would mean logging into the operator dashboard silently replaced the kiosk's
 * device identity — so each surface gets its own key.
 *
 * `sessionStorage`, not `localStorage`: a demo token should not outlive the window.
 */

import type { Role, TokenResponse } from "@/api/client";

export type Surface = "kiosk" | "operator";

export interface StoredAuth {
  token: string;
  role: Role;
  displayName: string;
  userId: string | null;
  boothId: string | null;
  boothCode: string | null;
  location: string | null;
}

const KEYS: Record<Surface, string> = {
  kiosk: "pb.auth.kiosk",
  operator: "pb.auth.operator",
};

export function saveAuth(surface: Surface, response: TokenResponse): StoredAuth {
  const auth: StoredAuth = {
    token: response.access_token,
    role: response.role,
    displayName: response.display_name,
    userId: response.user_id,
    boothId: response.booth_id,
    boothCode: response.booth_code,
    location: response.location,
  };
  sessionStorage.setItem(KEYS[surface], JSON.stringify(auth));
  return auth;
}

export function loadAuth(surface: Surface): StoredAuth | null {
  const raw = sessionStorage.getItem(KEYS[surface]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    return parsed.token ? parsed : null;
  } catch {
    sessionStorage.removeItem(KEYS[surface]);
    return null;
  }
}

export function clearAuth(surface: Surface): void {
  sessionStorage.removeItem(KEYS[surface]);
}
