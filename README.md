# DataFlex — Data & Airtime Wallet Platform

A wallet-based data and airtime purchase system with spending analytics, budget tracking, and scheduled top-ups.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend:** Lovable Cloud (Supabase) — Auth, PostgreSQL, Edge Functions
- **State:** React Context (Auth, Wallet, PhoneNumber) + TanStack React Query
- **Routing:** React Router v6

## Project Structure

```
src/
├── api/                  # Service layer — ALL backend communication
│   ├── client.ts         # Axios client (future external API)
│   ├── auth.ts           # Authentication (signup, login, logout, password reset)
│   ├── wallets.ts        # Wallet ops, purchases, transaction updates
│   ├── transactions.ts   # Transaction history queries
│   ├── budgets.ts        # Budget management & spending analytics
│   ├── users.ts          # Profiles, KYC, phone numbers
│   ├── notifications.ts  # Notification CRUD
│   ├── scheduled-topups.ts # Scheduled top-up management
│   ├── greeting.ts       # Personalised greeting
│   └── index.ts          # Barrel export
├── contexts/             # React Contexts (consume api/ services only)
├── hooks/                # Custom hooks (consume api/ services only)
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── views/            # Page-level view components
│   ├── dashboard/        # Dashboard widgets
│   ├── analytics/        # Spending analytics components
│   ├── scheduled/        # Scheduled top-up components
│   ├── settings/         # Settings components
│   ├── onboarding/       # Onboarding flow
│   ├── kyc/              # KYC verification
│   ├── layout/           # Navigation & layout
│   ├── receipt/          # Transaction receipts
│   └── notifications/    # Notification UI
├── pages/                # Route pages (Index, Auth, ResetPassword)
├── lib/                  # Utilities, constants, validation
└── integrations/supabase # Auto-generated client & types (do not edit)

supabase/
└── functions/            # Edge Functions (serverless backend logic)
    ├── payflex-airtime-topup/
    ├── payflex-data-topup/
    ├── scheduled-topups/
    ├── execute-scheduled-topups/
    ├── cancel-managed-topup/
    ├── secure-transaction-update/
    ├── budget-management/
    ├── spending-analytics/
    ├── verify-nin/
    └── get-greeting/
```

## Architecture

All UI components communicate with the backend exclusively through the **`src/api/` service layer**. No component, context, or hook imports the Supabase client directly. This enables a future migration to an external Node.js API by updating only the service implementations.

```
UI Components → Contexts/Hooks → src/api/* services → Supabase (current) / External API (future)
```

## Getting Started

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
```

Requires Node.js ≥ 18. Environment variables are auto-managed by Lovable Cloud.

## Deployment

Open [Lovable](https://lovable.dev/projects/aa2c836e-a80f-4ffd-817d-563115fa8f47) → Share → Publish.
