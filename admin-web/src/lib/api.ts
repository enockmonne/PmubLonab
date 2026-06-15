import axios, { AxiosError, AxiosInstance } from 'axios';
import { clearAuth, getToken } from './auth';

// API base URL.
//  - In dev preview (served by FastAPI at /api/admin-ui/), VITE_API_URL is empty
//    and we use relative URLs which the same origin will route to /api/* via Kubernetes ingress.
//  - In standalone deployment, set VITE_API_URL=https://api.your-domain.com
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401) {
      // Token invalid/expired → force re-login
      clearAuth();
      if (window.location.pathname !== `${import.meta.env.BASE_URL}login` && !window.location.pathname.endsWith('/login')) {
        window.location.href = `${import.meta.env.BASE_URL}login`;
      }
    }
    return Promise.reject(error);
  }
);

export function apiError(error: unknown): string {
  const e = error as AxiosError<{ detail?: string }>;
  return (
    e.response?.data?.detail ||
    e.message ||
    'Une erreur est survenue.'
  );
}

// ----- Endpoints -----
export interface DashboardStats {
  stats: { total_races: number; programmes: number; results: number };
  current_race?: { race_id: string; name: string; date_text?: string; location?: string } | null;
  last_upload?: { race_id: string; name: string; date_text?: string; created_at?: string; doc_type?: string } | null;
  llm: { status: string; error?: string | null };
  admin: { email: string; role: string; last_login_at?: string };
}

export interface Race {
  race_id: string;
  name: string;
  date_text?: string;
  date_iso?: string;
  location?: string;
  doc_type?: string;
  is_current?: boolean;
  created_at?: string;
  linked_programme_ids?: string[];
  linked_result_ids?: string[];
  linked_programmes_count?: number;
  linked_results_count?: number;
  linked_programmes?: LinkedRaceSummary[];
  linked_results?: LinkedRaceSummary[];
}

export interface LinkedRaceSummary {
  race_id: string;
  name?: string;
  date_text?: string;
  date_iso?: string;
  location?: string;
  doc_type?: string;
}

export interface Announcement {
  id: string;
  message: string;
  level: string;
  active: boolean;
  created_at?: string;
}

export interface AdminLog {
  id?: string;
  admin_email?: string;
  action: string;
  meta?: Record<string, unknown>;
  created_at?: string;
}

export interface BetaAccessCodeUsage {
  code: string;
  configured: boolean;
  device_count: number;
  total_uses: number;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  suspicious: boolean;
}

export interface BetaAccessDeviceUsage {
  code: string;
  device_id: string;
  platform?: string;
  use_count?: number;
  first_seen_at?: string;
  last_seen_at?: string;
  ip?: string;
  user_agent?: string;
}

export interface BetaAccessUsageResponse {
  enabled: boolean;
  configured_codes_count: number;
  codes: BetaAccessCodeUsage[];
  devices: BetaAccessDeviceUsage[];
}

export interface ParseQuality {
  doc_type: string;
  expected_runners: number;
  horses_count: number;
  predictions_count: number;
  classifications_count: number;
  odds_count: number;
  weekly_best_count: number;
  has_predictions: boolean;
  has_classifications: boolean;
  has_odds: boolean;
  has_weekly_best: boolean;
  has_previous_results: boolean;
  has_betting_info: boolean;
  warnings: string[];
}

export interface UploadRaceResponse {
  ok: boolean;
  race_id: string;
  summary: {
    name: string;
    location?: string;
    date?: string;
    runners: number;
    horses_parsed: number;
    doc_type?: string;
    parse_quality?: ParseQuality;
    linked?: RaceLinkSummary;
  };
}

export interface RaceLinkSummary {
  linked_programmes: string[];
  linked_results: string[];
}

export interface LonabImportPreviewItem {
  title: string;
  page_url: string;
  pdf_url: string;
  filename: string;
  doc_type: string;
}

export interface LonabImportPreviewResponse {
  source_url: string;
  scanned_pages: number;
  items: LonabImportPreviewItem[];
  count: number;
  discovered_count?: number;
  already_imported_count?: number;
  errors: string[];
}

export interface LonabImportResult {
  pdf_url: string;
  filename: string;
  status: 'imported' | 'skipped' | 'error';
  reason?: string;
  race_id?: string;
  name?: string;
  doc_type?: string;
  error?: string;
  parse_quality?: ParseQuality;
  linked?: RaceLinkSummary;
}

export interface LonabImportResponse {
  ok: boolean;
  results: LonabImportResult[];
  imported: number;
  skipped: number;
  errors: number;
}

export interface LonabRecentImport {
  race_id: string;
  name: string;
  date_text?: string;
  date_iso?: string;
  location?: string;
  doc_type?: string;
  parse_quality?: ParseQuality;
  linked_programme_ids?: string[];
  linked_result_ids?: string[];
  import_source?: {
    provider: string;
    pdf_url: string;
    filename: string;
    file_hash: string;
    imported_at: string;
  };
}

export const Auth = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: { email: string; role: string } }>(
      '/auth/login',
      { email, password }
    ),
  me: () => api.get<{ email: string; role: string }>('/auth/me'),
  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/change-password', { old_password, new_password }),
};

export const Admin = {
  status: () => api.get<DashboardStats>('/admin/status'),
  uploadRace: (file: File, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<UploadRaceResponse>('/admin/races/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // PDF parsing via LLM can take 2-3 minutes per file. Override default timeout.
      timeout: 300000, // 5 min
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },
  setCurrent: (race_id: string) => api.post(`/admin/races/${race_id}/set-current`),
  deleteRace: (race_id: string) => api.delete(`/admin/races/${race_id}`),
  overrideRaceLink: (race_id: string, target_race_id: string | null) =>
    api.post(`/admin/races/${race_id}/link-override`, { target_race_id }),
  linkRelatedRaces: () =>
    api.post<{
      ok: boolean;
      documents_scanned: number;
      programmes_linked: number;
      results_linked: number;
    }>('/admin/races/link-related'),
  previewLonabArchive: (payload: {
    source_url: string;
    max_pages: number;
    limit: number;
    follow_detail_pages: boolean;
  }) => api.post<LonabImportPreviewResponse>('/admin/imports/lonab/preview', payload, { timeout: 120000 }),
  importLonabPdfs: (pdf_urls: string[]) =>
    api.post<LonabImportResponse>('/admin/imports/lonab/import', { pdf_urls }, { timeout: 900000 }),
  listLonabImports: (limit = 20) =>
    api.get<{ imports: LonabRecentImport[]; count: number }>(`/admin/imports/lonab/recent?limit=${limit}`),
  listRaces: () => api.get<{ races: Race[] }>('/races?limit=200'),
  listAnnouncements: () => api.get<{ announcements: Announcement[] }>('/admin/announcements'),
  createAnnouncement: (message: string, level: string) =>
    api.post<{ ok: boolean; announcement: Announcement }>('/admin/announcements', {
      message,
      level,
      active: true,
    }),
  deleteAnnouncement: (id: string) => api.delete(`/admin/announcements/${id}`),
  listLogs: (limit = 50) => api.get<{ logs: AdminLog[] }>(`/admin/logs?limit=${limit}`),
  betaAccessUsage: () => api.get<BetaAccessUsageResponse>('/admin/beta-access/usage'),
};
