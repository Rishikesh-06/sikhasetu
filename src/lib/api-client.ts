const getApiBase = (): string => {
  const envUrl = (import.meta as any).env?.["VITE_API_URL"];
  if (envUrl) return envUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "/api";
  }
  return "http://localhost:3001/api";
};

const API_BASE = getApiBase();

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("sikhsetu_auth_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      throw new ApiError(response.status, errorData.error || `HTTP ${response.status} error`, errorData);
    }

    return await response.json() as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, `Network or Server Error: ${err.message}`);
  }
}
