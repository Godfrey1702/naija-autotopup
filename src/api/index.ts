/**
 * @fileoverview API Service Layer - Barrel Export
 * 
 * Central export point for all service modules.
 * UI components should import from here rather than calling Supabase directly.
 * 
 * ## Migration Guide
 * When switching from Supabase to the external Node.js backend:
 * 1. Set VITE_API_URL in .env to your deployed backend URL
 * 2. Uncomment the `api` imports in each service file
 * 3. Swap the implementation in each function (commented code is ready)
 * 4. No UI component changes needed
 * 
 * ## Edge Function → Backend Module Mapping
 * | Supabase Function        | Backend Module   | Service File      |
 * |--------------------------|------------------|-------------------|
 * | payflex-airtime-topup    | transactions     | transactions.ts   |
 * | payflex-data-topup       | transactions     | transactions.ts   |
 * | scheduled-topups         | transactions     | transactions.ts   |
 * | spending-analytics       | budgets          | budgets.ts        |
 * | verify-nin               | users            | users.ts          |
 * | secure-transaction-update| transactions     | transactions.ts   |
 * | budget-management        | budgets          | budgets.ts        |
 * 
 * @module api
 */

export { api, setAuthToken, isExternalApiEnabled } from "./client";
export * as authService from "./auth";
export * as transactionService from "./transactions";
export * as walletService from "./wallets";
export * as budgetService from "./budgets";
export * as userService from "./users";
