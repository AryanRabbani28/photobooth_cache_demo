/**
 * Typed API client.
 *
 * Same-origin through the Vite proxy, so there is no base URL to configure and no CORS
 * preflight. Tokens are held per surface (see `session.ts`): a kiosk tab and an operator
 * tab in the same browser must not share credentials, since they are different
 * principals in §20.2 terms.
 */

import type { TemplateConfig } from "@/lib/compositor";

const BASE = "/api/v1";

export type Role = "ADMIN" | "OPERATOR" | "BOOTH_DEVICE";

export type SessionStatus =
  | "CREATED"
  | "READY"
  | "TEMPLATE_SELECTED"
  | "ACTIVE"
  | "PAUSED"
  | "PHOTO_COMPLETE"
  | "FINAL_PREVIEW"
  | "PRINTING"
  | "PRINT_FAILED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "ERROR";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: Role;
  display_name: string;
  user_id: string | null;
  booth_id: string | null;
  booth_code: string | null;
  location: string | null;
}

export interface DeviceStatus {
  camera_status: string;
  camera_model: string | null;
  printer_status: string;
  printer_model: string | null;
  internet_status: string;
  disk_free_mb: number | null;
  app_version: string | null;
  updated_at: string;
}

export interface Booth {
  id: string;
  name: string;
  booth_code: string;
  device_id: string | null;
  status: "ONLINE" | "OFFLINE" | "BUSY" | "MAINTENANCE";
  last_seen: string | null;
  app_version: string | null;
  location_name: string | null;
  device_status: DeviceStatus | null;
  active_session_id: string | null;
}

export interface Package {
  id: string;
  name: string;
  duration_seconds: number;
  max_photos: number;
  max_retakes: number;
  number_of_prints: number;
  price: number | null;
  expiry_behavior: string;
  grace_period_sec: number;
}

export interface Template {
  id: string;
  name: string;
  category: string | null;
  configuration: TemplateConfig;
  number_of_slots: number;
  version: number;
}

export interface Lut {
  id: string;
  name: string;
  description: string | null;
  css_filter: string | null;
  file_path: string;
}

export interface Session {
  id: string;
  booth_id: string;
  booth_code: string | null;
  operator_id: string | null;
  operator_name: string | null;
  package_id: string | null;
  package_name: string | null;
  template_id: string | null;
  template_name: string | null;
  customer_name: string | null;
  status: SessionStatus;
  allocated_time: number;
  remaining_time: number | null;
  total_photos: number;
  photos_captured: number;
  retakes_used: number;
  max_retakes: number | null;
  number_of_prints: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  photo_count: number;
  final_output_id: string | null;
  final_output_path: string | null;
}

export interface Photo {
  id: string;
  session_id: string;
  slot_index: number;
  original_file_path: string;
  processed_file_path: string | null;
  filter_name: string | null;
  is_kept: boolean;
  captured_at: string;
}

export interface PrintJob {
  id: string;
  session_id: string;
  final_output_id: string | null;
  copies: number;
  status: "QUEUED" | "PRINTING" | "COMPLETED" | "FAILED" | "CANCELLED";
  error_message: string | null;
  is_reprint: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface OverviewStats {
  total_booths: number;
  online_booths: number;
  offline_booths: number;
  active_sessions: number;
  sessions_today: number;
  photos_today: number;
  prints_today: number;
  errors_today: number;
  top_locations: { location: string; sessions: number }[];
  popular_templates: { template: string; uses: number }[];
  popular_filters: { filter: string; uses: number }[];
}

export interface LogEntry {
  id: string;
  level: string;
  source: string | null;
  message: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

/** An HTTP error carrying the backend's message, so 409s can be shown verbatim. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** A refused state transition or a busy booth — expected, not a crash. */
  get isConflict(): boolean {
    return this.status === 409;
  }
}

async function request<T>(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    // A dropped connection to the backend, not an HTTP status.
    throw new ApiError(0, "Cannot reach the backend — is uvicorn running on :8000?");
  }

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
      else if (Array.isArray(body?.detail)) {
        // Pydantic validation errors.
        detail = body.detail.map((d: { msg: string }) => d.msg).join("; ");
      }
    } catch {
      // Keep the status line.
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  // ------------------------------------------------------------------- auth
  login: (username: string, password: string) =>
    request<TokenResponse>("/auth/login", null, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  deviceLogin: (device_id: string, device_secret: string) =>
    request<TokenResponse>("/auth/device-login", null, {
      method: "POST",
      body: JSON.stringify({ device_id, device_secret }),
    }),

  // -------------------------------------------------------------- catalogue
  packages: (token: string) => request<Package[]>("/packages", token),
  templates: (token: string, maxSlots?: number) =>
    request<Template[]>(
      `/templates${maxSlots ? `?max_slots=${maxSlots}` : ""}`,
      token,
    ),
  luts: (token: string) => request<Lut[]>("/luts", token),

  // ----------------------------------------------------------------- booths
  booths: (token: string) => request<Booth[]>("/booths", token),
  booth: (token: string, id: string) => request<Booth>(`/booths/${id}`, token),
  boothSession: (token: string, id: string) =>
    request<Session | null>(`/booths/${id}/session`, token),
  lockBooth: (token: string, id: string) =>
    request<Session | null>(`/booths/${id}/lock`, token, { method: "POST" }),
  unlockBooth: (token: string, id: string) =>
    request<Session | null>(`/booths/${id}/unlock`, token, { method: "POST" }),

  // ------------------------------------------------------------ kiosk (device)
  boothMe: (token: string) => request<Booth>("/booth/me", token),
  boothLiveSession: (token: string) => request<Session | null>("/booth/me/session", token),
  kioskSession: (token: string, id: string) =>
    request<Session>(`/booth/sessions/${id}`, token),
  heartbeat: (token: string, body: Record<string, unknown>) =>
    request<Booth>("/booth/heartbeat", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // --------------------------------------------------------------- sessions
  createSession: (
    token: string,
    body: {
      booth_id: string;
      package_id: string;
      customer_name?: string | null;
      duration_seconds?: number | null;
      number_of_prints?: number | null;
    },
  ) => request<Session>("/sessions", token, { method: "POST", body: JSON.stringify(body) }),

  sessions: (
    token: string,
    params: { booth_id?: string; status?: string; live?: boolean; limit?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.booth_id) q.set("booth_id", params.booth_id);
    if (params.status) q.set("status", params.status);
    if (params.live) q.set("live", "true");
    if (params.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<Session[]>(`/sessions${qs ? `?${qs}` : ""}`, token);
  },

  session: (token: string, id: string) => request<Session>(`/sessions/${id}`, token),

  selectTemplate: (token: string, id: string, template_id: string) =>
    request<Session>(`/sessions/${id}/select-template`, token, {
      method: "POST",
      body: JSON.stringify({ template_id }),
    }),
  begin: (token: string, id: string) =>
    request<Session>(`/sessions/${id}/begin`, token, { method: "POST" }),
  tick: (token: string, id: string, remaining_time: number) =>
    request<Session>(`/sessions/${id}/tick`, token, {
      method: "POST",
      body: JSON.stringify({ remaining_time }),
    }),
  expire: (token: string, id: string, remaining_time = 0) =>
    request<Session>(`/sessions/${id}/expire`, token, {
      method: "POST",
      body: JSON.stringify({ remaining_time }),
    }),
  photosComplete: (token: string, id: string) =>
    request<Session>(`/sessions/${id}/photos-complete`, token, { method: "POST" }),
  retake: (token: string, id: string, slot_index: number) =>
    request<Session>(`/sessions/${id}/retake`, token, {
      method: "POST",
      body: JSON.stringify({ slot_index }),
    }),

  pause: (token: string, id: string) =>
    request<Session>(`/sessions/${id}/pause`, token, { method: "POST" }),
  resume: (token: string, id: string) =>
    request<Session>(`/sessions/${id}/resume`, token, { method: "POST" }),
  addTime: (token: string, id: string, seconds: number) =>
    request<Session>(`/sessions/${id}/add-time`, token, {
      method: "POST",
      body: JSON.stringify({ seconds }),
    }),
  cancel: (token: string, id: string) =>
    request<Session>(`/sessions/${id}/cancel`, token, { method: "POST" }),
  restart: (token: string, id: string) =>
    request<Session>(`/sessions/${id}/restart`, token, { method: "POST" }),

  // ----------------------------------------------------------------- photos
  uploadPhoto: (
    token: string,
    sessionId: string,
    slotIndex: number,
    original: Blob,
    processed: Blob | null,
    filterName: string | null,
  ) => {
    const form = new FormData();
    form.set("slot_index", String(slotIndex));
    if (filterName) form.set("filter_name", filterName);
    form.set("original", original, `slot_${slotIndex}.jpg`);
    if (processed) form.set("processed", processed, `slot_${slotIndex}_p.jpg`);
    return request<Photo>(`/sessions/${sessionId}/photos`, token, {
      method: "POST",
      body: form,
    });
  },

  uploadFinal: (token: string, sessionId: string, image: Blob) => {
    const form = new FormData();
    form.set("image", image, "final.jpg");
    return request<{ id: string; session_id: string; file_path: string; created_at: string }>(
      `/sessions/${sessionId}/final`,
      token,
      { method: "POST", body: form },
    );
  },

  photos: (token: string, sessionId: string) =>
    request<Photo[]>(`/sessions/${sessionId}/photos`, token),

  // ------------------------------------------------------------------ print
  print: (token: string, sessionId: string, copies?: number) =>
    request<PrintJob>(`/sessions/${sessionId}/print`, token, {
      method: "POST",
      body: JSON.stringify({ copies: copies ?? null }),
    }),
  reprint: (token: string, sessionId: string, copies = 1) =>
    request<PrintJob>(`/sessions/${sessionId}/reprint`, token, {
      method: "POST",
      body: JSON.stringify({ copies }),
    }),
  printJobs: (token: string, sessionId?: string) =>
    request<PrintJob[]>(
      `/print-jobs${sessionId ? `?session_id=${sessionId}` : ""}`,
      token,
    ),
  setPrinterFailure: (token: string, armed: boolean) =>
    request<{ failure_armed: boolean }>(`/printer/fail-next?armed=${armed}`, token, {
      method: "POST",
    }),
  printerFailure: (token: string) =>
    request<{ failure_armed: boolean }>("/printer/fail-next", token),

  // -------------------------------------------------------------- analytics
  overview: (token: string) => request<OverviewStats>("/analytics/overview", token),
  logs: (token: string, limit = 50) => request<LogEntry[]>(`/logs?limit=${limit}`, token),
};

/**
 * URL for a stored image.
 *
 * The token rides in the query string because `<img src>` cannot send an Authorization
 * header, and these are customer photographs that should not sit on an open route.
 */
export function mediaUrl(token: string, path: string): string {
  return `${BASE}/media/${path}?token=${encodeURIComponent(token)}`;
}
