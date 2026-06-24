// frontend/src/lib/auth.ts
// Shared auth utilities for Kuhik frontend — JWT decoding, role extraction, redirect

export type KuhikRole = "admin" | "haldur" | "korteriomanik";

export interface KuhikUser {
  id: string;
  email: string;
  role: KuhikRole;
  name?: string;
  orgId?: string;
  orgName?: string;
}

/**
 * Decode a JWT token payload without verification.
 * Used on frontend to extract role for UI filtering.
 */
export function decodeToken(token: string): KuhikUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return {
      id: payload.id || payload.sub || "",
      email: payload.email || "",
      role: mapBackendRole(payload.role || ""),
      name: payload.name || payload.email || "",
    };
  } catch {
    return null;
  }
}

/**
 * Map backend roles (Admin, BoardMember, Owner, Tenant)
 * to frontend roles (admin, haldur, korteriomanik).
 */
function mapBackendRole(role: string): KuhikRole {
  switch (role) {
    case "system_admin":
    case "admin":
    case "Admin":
      return "admin";
    case "BoardMember":
    case "board_member":
    case "haldur":
      return "haldur";
    case "Owner":
    case "owner":
    case "Tenant":
    case "tenant":
    case "korteriomanik":
      return "korteriomanik";
    default:
      return "korteriomanik";
  }
}

/**
 * Get current user from localStorage.
 */
export function getCurrentUser(): KuhikUser | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("kuhik_token");
  if (!token) return null;
  if (isTokenExpired(token)) {
    localStorage.removeItem("kuhik_token");
    localStorage.removeItem("kuhik_user");
    return null;
  }
  return decodeToken(token);
}

/**
 * Get current user role.
 */
export function getUserRole(): KuhikRole | null {
  const user = getCurrentUser();
  return user?.role ?? null;
}

/**
 * Check if a JWT token is expired by examining its exp claim.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false; // no exp claim - assume valid
    const expiryMs = payload.exp * 1000; // exp is in seconds
    return Date.now() >= expiryMs;
  } catch {
    return true; // can't parse - treat as expired
  }
}

/**
 * Get token from localStorage with expiry check.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("kuhik_token");
  if (!token) return null;
  if (isTokenExpired(token)) {
    localStorage.removeItem("kuhik_token");
    localStorage.removeItem("kuhik_user");
    return null;
  }
  return token;
}

/**
 * Get redirect path based on role. Used after login.
 */
export function getRedirectPath(role: KuhikRole): string {
  switch (role) {
    case "admin":
    case "haldur":
      return "/haldur";
    case "korteriomanik":
      return "/resident";
  }
}

/**
 * Check if user is authenticated (token exists and not expired).
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Logout — clear storage and redirect.
 */
export function logout(router: { push: (url: string) => void }) {
  localStorage.removeItem("kuhik_token");
  localStorage.removeItem("kuhik_user");
  router.push("/login");
}