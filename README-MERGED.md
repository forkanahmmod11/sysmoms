# Sysmobyte SaaS + OMS — Merged Build

This repository uses the original Sysmobyte SaaS website/UI as the base and adds the Office Management System workspace modules without redesigning the public website.

## Workspace modules
- Overview
- Subscription
- Tasks
- Projects
- Team
- Departments
- Schedule
- Messages
- Notices
- Applications (leave / remote / half-day / other)
- Community
- Transactions
- My Profile
- Settings

## SaaS flow
Sign up / sign in → isolated organization onboarding → subscription request → admin approval → full workspace access.

## Environment
Copy `.env.example` to `.env` and provide the Supabase project URL and anon key.

## Local development
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
```

## Supabase
Apply migrations in `supabase/migrations/` in filename order. The final hardening migration adds the profile fields used by the UI and secures organization-scoped OMS applications.
