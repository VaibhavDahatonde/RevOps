# Supabase Migrations Guide

This guide explains how to manage and push Supabase migrations for the RevOps AI Copilot project.

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   You can find your project ref in your Supabase project settings.

## Migration Structure

Migrations are stored in `supabase/migrations/` directory. Each migration file follows the naming convention:
```
YYYYMMDDHHMMSS_description.sql
```

Example: `20250108000000_initial_schema.sql`

## Pushing Migrations

### Push to Remote Supabase Project

1. **Push all migrations:**
   ```bash
   supabase db push
   ```
   This will push all pending migrations to your remote Supabase project.

2. **Push with confirmation:**
   ```bash
   supabase db push --linked
   ```
   This pushes migrations to your linked project.

### Alternative: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20250108000000_initial_schema.sql`
4. Paste and run the SQL script

## Local Development

### Start Local Supabase

```bash
supabase start
```

This starts a local Supabase instance with all migrations applied.

### Reset Local Database

```bash
supabase db reset
```

This resets your local database and applies all migrations from scratch.

## Creating New Migrations

### Create a new migration file:

```bash
supabase migration new migration_name
```

This creates a new timestamped migration file in `supabase/migrations/`.

### Or create manually:

Create a new file in `supabase/migrations/` with the format:
```
YYYYMMDDHHMMSS_description.sql
```

## Migration Best Practices

1. **Always use transactions:** Wrap your migrations in transactions when possible
2. **Make migrations reversible:** Consider down migrations for rollback
3. **Test locally first:** Always test migrations locally before pushing to production
4. **Backup before migration:** Backup your database before applying migrations to production
5. **Use IF NOT EXISTS:** Use `CREATE TABLE IF NOT EXISTS` to avoid errors on re-runs

## Current Migrations

- `20250108000000_initial_schema.sql` - Initial database schema with all tables, indexes, and RLS policies

## Troubleshooting

### Migration conflicts
If you encounter conflicts, you may need to:
1. Check the migration history in Supabase dashboard
2. Manually resolve conflicts
3. Create a new migration to fix issues

### Connection issues
Make sure:
- You're logged in: `supabase login`
- Your project is linked: `supabase link --project-ref your-project-ref`
- Your project ref is correct

## Useful Commands

```bash
# Check migration status
supabase migration list

# Generate TypeScript types from database
supabase gen types typescript --linked > lib/types/supabase.ts

# View local database
supabase db diff

# Pull remote schema
supabase db pull
```

## Important Notes

- Never modify existing migration files that have been pushed to production
- Always create new migrations for schema changes
- Test migrations in a staging environment first
- Keep migration files in version control (Git)

