# TECHNICAL & PRODUCT DOCUMENTATION

**Project:** DataFlex — Data & Airtime Wallet Platform  
**Phase:** MVP  
**Last Updated:** 2026-03-11

---

## 1. Project Overview

A wallet-based data and airtime purchase system enabling users to:

- Manually purchase data and airtime for any Nigerian network
- Schedule recurring or one-time top-ups
- Track spending with analytics dashboards
- Set and monitor monthly spending budgets
- Receive budget threshold alerts (50%, 75%, 90%, 100%)

**Philosophy:** Analytics-first, manual-control product. Users stay aware of spending.

---

## 2. Architecture

### Frontend

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui design system
- Framer Motion for animations
- React Router v6 (SPA, tab-based navigation)

### Backend (Lovable Cloud)

- Authentication (email/password, email verification)
- PostgreSQL database
- Edge Functions (serverless business logic)

### Service Layer (`src/api/`)

All backend communication is routed through modular service files. No UI component imports the database client directly.

| Service | Responsibilities |
|---------|-----------------|
| `auth` | Signup, login, logout, password reset, session management |
| `wallets` | Wallet balance, funding, purchases, auto top-up rules |
| `transactions` | Transaction history, filtering, receipts |
| `budgets` | Budget CRUD, spending analytics |
| `users` | Profiles, KYC verification, phone number management |
| `notifications` | Fetch, mark read, mark all read |
| `scheduled-topups` | Create, update, cancel, list scheduled top-ups |
| `greeting` | Time-based personalised greeting |

This decoupling allows swapping the backend (e.g. to a Node.js API) by editing only service implementations.

---

## 3. Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (name, phone, KYC status) |
| `wallets` | User wallet (balance, currency) |
| `transactions` | All financial transactions (immutable audit trail) |
| `phone_numbers` | Registered phone numbers per user |
| `user_budgets` | Monthly budget settings and spend tracking |
| `user_kyc` | KYC/NIN verification records |
| `notifications` | In-app notifications |
| `auto_topup_rules` | Threshold-based auto top-up configuration |
| `scheduled_topups` | Scheduled (one-time/recurring) top-up definitions |
| `scheduled_topup_executions` | Execution log for scheduled top-ups |
| `spending_events` | Categorised spending events for analytics |

### Key Enums

- `transaction_status`: pending, completed, failed, refunded
- `transaction_type`: deposit, withdrawal, airtime_purchase, data_purchase, auto_topup

---

## 4. Authentication & Session Policy

- Email/password authentication with email verification
- No silent session persistence — users re-authenticate on app re-entry
- Short-lived access tokens
- Designed for shared-device safety

---

## 5. Core Flows

### Manual Purchase

1. User selects plan (airtime/data), network, phone number
2. Frontend validates via `usePurchaseValidation` hook
3. Service layer creates pending transaction + invokes purchase Edge Function
4. Edge Function calls third-party telecom API
5. On success: wallet debited, transaction completed, spending event recorded
6. On failure: transaction marked failed, wallet unchanged

### Scheduled Top-Ups

- **One-time:** Execute at a specific date/time
- **Recurring:** Daily, weekly, or monthly with configurable time
- Managed via `scheduled-topups` Edge Function
- Execution handled by `execute-scheduled-topups` Edge Function

### Budget & Analytics

- User sets monthly budget in Settings
- Real-time spend tracking against budget
- Alerts at 50%, 75%, 90%, 100% thresholds
- Analytics dashboard: pie charts, network breakdown, monthly trends

---

## 6. Edge Functions

| Function | Purpose |
|----------|---------|
| `payflex-airtime-topup` | Process airtime purchases via provider API |
| `payflex-data-topup` | Process data purchases via provider API |
| `secure-transaction-update` | Wallet funding & transaction status updates |
| `budget-management` | Get/set monthly budgets |
| `spending-analytics` | Aggregated spending data for analytics |
| `scheduled-topups` | CRUD for scheduled top-up definitions |
| `execute-scheduled-topups` | Cron-triggered execution of due schedules |
| `cancel-managed-topup` | Cancel a scheduled top-up |
| `verify-nin` | NIN/KYC verification |
| `get-greeting` | Personalised time-based greeting |

---

## 7. Security

- All financial logic runs server-side (Edge Functions)
- RLS policies on all tables
- No client-side balance computation
- KYC verification required before purchases
- Phone verification in onboarding flow

---

## 8. Scalability Notes

- Stateless API design
- Idempotent transaction endpoints
- Queue-based provider calls (future)
- MVP target: 100–300 TPS
