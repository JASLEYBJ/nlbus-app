import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

const TOKEN_KEY = "nlbus.token";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Erro ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : "Erro na requisição");
  }
  return data as T;
}

export const api = {
  // Auth
  register: (email: string, password: string, name?: string) =>
    request<{ access_token: string; user: any }>(`/auth/register`, {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: any }>(`/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; email: string; name?: string }>(`/auth/me`),

  // Lines
  listLines: (q?: string) => request<any[]>(`/lines${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  lineDetail: (id: string) => request<any>(`/lines/${id}`),

  // Stops
  listStops: () => request<any[]>(`/stops`),
  nearbyStops: (lat: number, lng: number, radiusKm = 2.5) =>
    request<any[]>(`/stops/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`),
  stopDetail: (id: string) => request<any>(`/stops/${id}`),

  // Favorites
  listFavorites: () => request<any[]>(`/favorites`),
  addFavorite: (item_type: "line" | "stop", item_id: string) =>
    request<any>(`/favorites`, { method: "POST", body: JSON.stringify({ item_type, item_id }) }),
  removeFavorite: (item_type: "line" | "stop", item_id: string) =>
    request<any>(`/favorites?item_type=${item_type}&item_id=${item_id}`, { method: "DELETE" }),

  // Ratings
  rateLine: (line_id: string, stars: number, comment?: string) =>
    request<any>(`/ratings`, {
      method: "POST",
      body: JSON.stringify({ line_id, stars, comment }),
    }),
  getRatings: (line_id: string) => request<any>(`/ratings/${line_id}`),

  // Planner
  plan: (origin_lat: number, origin_lng: number, dest_lat: number, dest_lng: number) =>
    request<{ options: any[] }>(`/planner`, {
      method: "POST",
      body: JSON.stringify({ origin_lat, origin_lng, dest_lat, dest_lng }),
    }),
};
