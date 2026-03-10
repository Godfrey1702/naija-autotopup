/**
 * @fileoverview API Service Layer - Barrel Export
 * 
 * Central export point for all service modules.
 * UI components should import from here rather than calling Supabase directly.
 * 
 * @module api
 */

export { api, setAuthToken, isExternalApiEnabled } from "./client";
export * as authService from "./auth";
export * as transactionService from "./transactions";
export * as walletService from "./wallets";
export * as budgetService from "./budgets";
export * as userService from "./users";
export * as notificationService from "./notifications";
export * as scheduledTopUpService from "./scheduled-topups";
export * as greetingService from "./greeting";
