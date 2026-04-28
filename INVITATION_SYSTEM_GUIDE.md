# 🔐 Invitation System - Setup & Usage Guide

Your app is now **invite-only**! Users need an invitation link to sign up.

---

## What Was Built

### ✅ 1. Database Table
**File:** `supabase/migrations/20250110180000_add_invitations.sql`
- Stores invitation codes, status, expiration
- Tracks who used which invite
- RLS policies for security

### ✅ 2. API Routes
**Files:**
- `/api/invitations/create` - Generate new invites
- `/api/invitations/validate` - Check if invite is valid
- `/api/invitations/accept` - Mark invite as used

### ✅ 3. Protected Signup Page
**File:** `app/signup/page.tsx`
- Requires `?invite=CODE` in URL
- Validates invite before showing form
- Shows error if no valid invite

### ✅ 4. Admin Interface
**File:** `app/admin/invites/page.tsx`
- Simple form to create invites
- Copy invitation links
- Track expiration

---

## How to Use

### Step 1: Apply Database Migration

```bash
cd "C:\Users\Vaibhav\RevOps"

# Apply the migration
supabase db push

# OR manually run the SQL file in Supabase dashboard
```

---

### Step 2: Commit and Push to GitHub

```bash
git add .
git commit -m "Add invitation-only signup system

- Database table for invitations
- API routes for create/validate/accept
- Protected signup page requires invite code
- Admin interface to generate invite links

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
git push origin main
```

Vercel will auto-deploy (2-3 minutes).

---

### Step 3: Generate Invitation Links

**Option A: Use Admin Page**

1. Go to: `https://revops-sandy.vercel.app/admin/invites`

2. Fill in the form:
   - **Email (Optional):** Restrict to specific email
   - **Notes:** Remember who this is for
   - **Expires In:** Choose 7-90 days

3. Click "Generate Invite Link"

4. Copy the URL (looks like):
   ```
   https://revops-sandy.vercel.app/signup?invite=ABC123XYZ789
   ```

5. Send to your beta user!

---

**Option B: Use API Directly (cURL)**

```bash
curl -X POST https://revops-sandy.vercel.app/api/invitations/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@acmecorp.com",
    "notes": "Met at SaaS conference",
    "expiresInDays": 30,
    "maxUses": 1
  }'
```

Response:
```json
{
  "invitation": {
    "id": "...",
    "code": "ABC123XYZ789",
    "email": "john@acmecorp.com"
  },
  "inviteUrl": "https://revops-sandy.vercel.app/signup?invite=ABC123XYZ789"
}
```

---

### Step 4: Share Invitation

**Send to your beta user:**

```
Subject: You're invited to RevOps AI Private Beta!

Hi [Name],

You're invited to try RevOps AI - an AI-powered platform that monitors your deals 24/7 and prevents revenue slippage.

Click here to sign up:
https://revops-sandy.vercel.app/signup?invite=ABC123XYZ789

This link expires in 30 days and can be used once.

Looking forward to your feedback!

Best,
Vaibhav
```

---

### Step 5: User Signs Up

**What the user experiences:**

1. Clicks your invitation link
2. Sees: "✅ Welcome to RevOps AI! You're invited to our private beta."
3. Enters email/password
4. Signs up successfully
5. Gets redirected to onboarding

**If they try to sign up without invite:**
- Direct access to `/signup` (no `?invite=` parameter)
- Shows: "🔒 Invitation Required. This is a private beta."
- Can't sign up!

---

## Features

### ✅ Email-Specific Invites

Create invite for specific email:
```json
{
  "email": "john@acmecorp.com"
}
```

Only `john@acmecorp.com` can use this invite. Form pre-fills their email.

---

### ✅ Expiration

All invites expire after X days (default: 30).

After expiration, shows: "Invitation has expired"

---

### ✅ Single-Use

Each invite works once by default.

After someone signs up, the invite is marked as `accepted` and can't be reused.

---

### ✅ Tracking

Database tracks:
- Who created the invite
- When it was created
- Who used it
- When it was used

---

## Testing

### Test 1: Generate Invite

1. Go to: https://revops-sandy.vercel.app/admin/invites
2. Create invite
3. You get a URL like: `https://revops-sandy.vercel.app/signup?invite=ABC123`

---

### Test 2: Valid Invite

1. Open invitation URL in incognito window
2. Should see: "✅ Welcome! You're invited"
3. Can sign up successfully

---

### Test 3: No Invite

1. Go directly to: https://revops-sandy.vercel.app/signup
2. Should see: "🔒 Invitation Required"
3. Can NOT sign up
4. Shows "Request Access" button

---

### Test 4: Invalid Invite

1. Go to: `https://revops-sandy.vercel.app/signup?invite=INVALID`
2. Should see: "🔒 Invalid invitation code"
3. Can NOT sign up

---

### Test 5: Used Invite

1. Sign up with an invite (Test 2)
2. Try using same invite URL again
3. Should see: "Invitation has been fully used"
4. Can NOT sign up again

---

## Database Schema

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,           -- Random code like "ABC123XYZ789"
  email TEXT,                          -- Optional: restrict to specific email
  status TEXT DEFAULT 'pending',       -- pending | accepted | expired
  max_uses INTEGER DEFAULT 1,          -- How many times usable (1 = single-use)
  uses_count INTEGER DEFAULT 0,        -- How many times used
  created_by TEXT,                     -- Admin who created it
  notes TEXT,                          -- Internal notes
  used_by_user_id UUID,                -- Who used it
  used_at TIMESTAMPTZ,                 -- When used
  expires_at TIMESTAMPTZ,              -- Expiration date
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Security

### ✅ RLS Enabled

Row Level Security policies:
- Anyone can READ pending invitations (needed for validation)
- Only service role can CREATE/UPDATE invitations

### ✅ Single-Use by Default

Each invite can only be used once. After signup, it's marked as `accepted`.

### ✅ Expiration

All invites have expiration date. Expired invites can't be used.

### ✅ Email Verification

Optional: Lock invite to specific email address.

---

## Managing Invitations

### View All Invitations (Supabase Dashboard)

1. Go to: https://supabase.com/dashboard
2. Your project → Table Editor
3. Select `invitations` table
4. See all invitations, status, who used them

---

### Revoke an Invitation

```sql
UPDATE invitations
SET status = 'expired'
WHERE code = 'ABC123XYZ789';
```

---

### Create Multi-Use Invite

For events/groups, create invite that can be used 10 times:

```json
{
  "maxUses": 10,
  "notes": "SaaS Summit Conference Attendees",
  "expiresInDays": 7
}
```

---

## Customization

### Change Expiration Default

**File:** `app/admin/invites/page.tsx`

```typescript
const [expiresInDays, setExpiresInDays] = useState(30) // ← Change default here
```

---

### Change Max Uses Default

**File:** `app/api/invitations/create/route.ts`

```typescript
maxUses = 1, // ← Change to 5, 10, etc for multi-use
```

---

### Add Admin Authentication

Currently, anyone who knows the URL can generate invites.

**To lock it down:**

1. Add auth check to admin page
2. Create `admin_users` table
3. Check if current user is admin
4. Redirect if not authorized

---

## Invite Strategies

### Strategy 1: Personal Invites (Best for Early Beta)

- Generate 1 invite per person
- Include their email in invite
- Track who they are in notes
- Follow up personally

**Goal:** 10-20 high-quality beta users

---

### Strategy 2: Group Invites (For Events)

- Generate 1 multi-use invite (maxUses: 50)
- Share at conference/event
- Set short expiration (7 days)
- Track which event it came from

**Goal:** Scale to 50-100 users quickly

---

### Strategy 3: Referral Invites (Growth)

- Give each user 3 invites to share
- Track who invited whom
- Gamify with leaderboard
- Reward top referrers

**Goal:** Viral growth

---

## Monitoring

### Conversion Rate

```sql
SELECT 
  COUNT(*) as total_invites,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as used_invites,
  ROUND(COUNT(CASE WHEN status = 'accepted' THEN 1 END)::float / COUNT(*) * 100, 2) as conversion_rate
FROM invitations;
```

---

### Most Recent Signups

```sql
SELECT 
  i.code,
  i.email,
  i.used_at,
  i.notes
FROM invitations i
WHERE i.status = 'accepted'
ORDER BY i.used_at DESC
LIMIT 10;
```

---

### Unused Invites

```sql
SELECT 
  code,
  email,
  notes,
  created_at,
  expires_at
FROM invitations
WHERE status = 'pending'
AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Issue: "Failed to validate invitation"

**Cause:** Database migration not applied.

**Fix:**
```bash
supabase db push
```

---

### Issue: "Anyone can still sign up"

**Cause:** Old signup page cached.

**Fix:**
1. Hard refresh: Ctrl+Shift+R
2. Or clear browser cache
3. Or use incognito

---

### Issue: "Admin page doesn't work"

**Cause:** API route error or env vars missing.

**Fix:**
1. Check Vercel logs
2. Verify all env vars are set
3. Check database connection

---

## Next Steps

### Week 1: Invite 10 People

- Generate 10 invites manually
- Send to targeted users
- Track who signs up
- Get feedback

---

### Week 2-4: Iterate Based on Feedback

- See who actually uses it
- Interview active users
- Fix pain points
- Add requested features

---

### Month 2: Scale to 50 Users

- Generate group invites
- Post in communities
- Share on Twitter/LinkedIn
- Track which channels convert

---

## Summary

✅ **You now have:**
- Invite-only signup (no one can sign up without invite)
- Admin interface to generate invites
- Tracking system to see who uses invites
- Email-specific invites
- Expiration dates
- Single-use by default

✅ **What's locked:**
- `/signup` without `?invite=` → Blocked
- Invalid/expired/used invites → Blocked

✅ **What's open:**
- `/signup?invite=VALID_CODE` → Works!

---

**Your app is now in private beta mode! 🎉**

Go to: https://revops-sandy.vercel.app/admin/invites

Generate your first invite and start testing! 🚀
