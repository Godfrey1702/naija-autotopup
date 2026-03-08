/**
 * @fileoverview Centralized API Client
 * 
 * This module provides an axios-based HTTP client for communicating with
 * an external backend API. Currently unused while the app runs on Lovable Cloud
 * (Supabase), but prepared for future migration to a Node.js backend.
 * 
 * ## Usage
 * Import `api` for external backend calls, or use the service layer
 * which abstracts the backend choice (Supabase vs external API).
 * 
 * @module api/client
 */

import axios from "axios";

/**
 * External API client instance.
 * Points to VITE_API_URL when set, otherwise defaults to a placeholder.
 * 
 * All requests through this client automatically include:
 * - Content-Type: application/json
 * - Authorization header (when token is set via setAuthToken)
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/**
 * Sets the JWT authorization token for all subsequent API requests.
 * Call this after login to attach the bearer token.
 * 
 * @param token - JWT token string, or null to clear
 */
export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

/**
 * Whether the external API is configured and should be used.
 * Returns true only when VITE_API_URL is set to a real URL.
 */
export function isExternalApiEnabled(): boolean {
  const url = import.meta.env.VITE_API_URL;
  return Boolean(url && url.length > 0 && url !== "https://future-backend-url/api");
}
