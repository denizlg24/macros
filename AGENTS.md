# Macros Agent Guide

## Purpose

Macros is a **MOBILE FIRST** MacroFactor-style nutrition tracker for food logs, micronutrients, recipes, weight trends, energy expenditure estimates, and multi-angle weigh-in photo metadata.

## Stack

- Next.js 16 App Router
- React 19
- Bun
- PostgreSQL
- Drizzle ORM and drizzle-kit
- Better Auth v1.6.x with the Drizzle adapter
- Resend for auth emails
- shadcn/ui and Tailwind CSS

## Nutrition API Source

Use `https://nutrition.denizlg24.com` as the source for food data. Store local food and nutrition snapshots so logs and recipes are stable even if the source API changes later.

## Snapshot Policies

- Do not mutate historical food nutrition snapshots.
- Do not mutate historical recipe nutrition snapshots.
- Create a new recipe nutrition snapshot whenever recipe ingredients, serving count, or serving label changes.
- Logged foods and recipes must point at the snapshot used at log time and store display fields for history.
- Prevent recipe cycles in application or business logic before writing recipe ingredients.

## Photo Policy

Store only object-storage metadata for weigh-in photos in PostgreSQL, including URL, storage key, MIME type, dimensions, byte size, checksum, capture time, and upload time. Do not store image bytes in PostgreSQL.

## Auth Policy

Auth is email/password only. Email verification is required before sign-in. Password reset and verification emails are sent through Resend using `RESEND_API_KEY` and `EMAIL_FROM`.

## Migration Workflow

1. Edit Drizzle schema in `db/schema.ts`.
2. Run `bunx drizzle-kit generate`.
3. Review the generated SQL.
4. Run `bunx drizzle-kit migrate`.
5. Run `bun run typecheck`, `bun run lint`, and `bun run build`.

If `gen_random_uuid()` is unavailable in a database, enable pgcrypto:

```sql
create extension if not exists pgcrypto;
```

## Guardrails

- Do not commit `.env`.
- Do not store photo bytes in PostgreSQL.
- Do not mutate historical nutrient snapshots.
- Keep object storage credentials and upload transport out of this scaffold unless explicitly requested.
