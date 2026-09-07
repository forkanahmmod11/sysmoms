# Sysmobyte SaaS + OMS — Final Merge

This build uses `sysmoms1-main` as the product/website base so its landing, authentication,
onboarding, subscription, platform-admin and overall website UI remain intact.

## Merged Office Management System
The workspace now includes the OMS-oriented modules:
- Overview / KPI workspace
- Tasks
- Projects
- Team
- Schedule
- Messages
- Transactions
- Settings
- Departments
- Notices / announcements
- Applications (leave, remote work, half-day, other)
- Personal profile editing

The added OMS modules are visually scoped so they do not restyle the existing Sysmobyte landing website.

## SaaS
The existing isolated-workspace onboarding, subscription approval flow and platform-admin flow
from `sysmoms1-main` remain the primary SaaS layer.

## Database
A new migration was added:
`supabase/migrations/20260907200000_oms_applications.sql`

Run the full Supabase migration set in filename order.

## Run
```bash
npm install
npm run dev
```

For production:
```bash
npm run build
npm run preview
```

Set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Important
The source ZIPs had overlapping/iterated database schemas. This merge intentionally keeps the
newer `sysmoms1-main` organization/SaaS schema as the base and adds only the missing Applications
table needed by the expanded OMS UI, avoiding destructive duplicate migration conflicts.
