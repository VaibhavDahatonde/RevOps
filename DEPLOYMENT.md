# 🚀 Production Deployment Guide

## Step 1: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- Project name? **revops-ai-copilot** (or your choice)
- Directory? **./  (current directory)**
- Override settings? **No**

4. **Deploy to Production:**
```bash
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com
2. Click "Import Project"
3. Connect your GitHub/GitLab (push code first) OR import Git repository
4. Select your repository
5. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: **.**
   - Build Command: **npm run build**
   - Output Directory: **.next**
6. Click "Deploy"

---

## Step 2: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

### Supabase (Keep same as development)
```
NEXT_PUBLIC_SUPABASE_URL=https://tiovsegphehhblokwgpx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### App URL (UPDATE THIS!)
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### HubSpot OAuth (UPDATE THESE!)
```
HUBSPOT_CLIENT_ID=your_production_client_id
HUBSPOT_CLIENT_SECRET=your_production_client_secret
HUBSPOT_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback/hubspot
```

### Google Gemini AI
```
GEMINI_API_KEY=AIzaSyAVda0my-NsVSkYMxwWFIknh5Gsu06jb3w
```

### Salesforce (Optional)
```
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback/salesforce
```

---

## Step 3: Create Production HubSpot OAuth App

### Current Setup (Development):
- App name: RevOps AI Copilot (Dev)
- Redirect URI: http://localhost:3000/api/auth/callback/hubspot
- Client ID: dccfda0d-1a37-4c6a-913f-1df80d04cc73

### Create Production App:

1. Go to https://developers.hubspot.com/
2. Click "Apps" → "Create App"
3. Fill in details:
   - **App Name**: RevOps AI Copilot
   - **Description**: AI-powered revenue operations platform
   - **App Logo**: Upload your logo
4. Go to "Auth" tab
5. Add **Redirect URL**:
   ```
   https://your-app.vercel.app/api/auth/callback/hubspot
   ```
6. Select **Scopes**:
   - ✅ crm.objects.contacts.read
   - ✅ crm.objects.companies.read
   - ✅ crm.objects.deals.read
   - ✅ crm.objects.owners.read
   - ✅ crm.schemas.deals.read
7. Click "Create App"
8. Copy **Client ID** and **Client Secret**
9. Add to Vercel environment variables

---

## Step 4: Update Production URLs

After Vercel deployment, you'll get a URL like:
```
https://revops-ai-copilot.vercel.app
```

### Update in 3 Places:

1. **Vercel Environment Variables:**
   - `NEXT_PUBLIC_APP_URL=https://revops-ai-copilot.vercel.app`
   - `HUBSPOT_REDIRECT_URI=https://revops-ai-copilot.vercel.app/api/auth/callback/hubspot`

2. **HubSpot Developer Portal:**
   - Go to your production app → Auth tab
   - Update Redirect URL to production URL

3. **Redeploy on Vercel:**
   ```bash
   vercel --prod
   ```
   Or in dashboard: Deployments → Redeploy

---

## Step 5: Test Production Deployment

### 1. Visit Your App
```
https://your-app.vercel.app
```

### 2. Test Complete Flow:
- [ ] Landing page loads
- [ ] Sign up with test email
- [ ] Redirects to onboarding
- [ ] Click "Connect HubSpot"
- [ ] OAuth flow works (redirects to HubSpot)
- [ ] Authorize app on HubSpot
- [ ] Redirects back successfully
- [ ] Sync completes
- [ ] Dashboard shows data
- [ ] AI chat works
- [ ] Risk modal opens
- [ ] CSV export works

### 3. Check Logs:
- Vercel Dashboard → Your Project → Logs
- Look for any errors

---

## Step 6: Custom Domain (Optional)

### Add your own domain:

1. **Buy domain** (GoDaddy, Namecheap, etc.)

2. **In Vercel Dashboard:**
   - Go to Settings → Domains
   - Add domain: `app.yourcompany.com`
   - Follow DNS configuration instructions

3. **Update Environment Variables:**
   - `NEXT_PUBLIC_APP_URL=https://app.yourcompany.com`
   - `HUBSPOT_REDIRECT_URI=https://app.yourcompany.com/api/auth/callback/hubspot`

4. **Update HubSpot OAuth Redirect URI**

5. **Redeploy**

---

## Troubleshooting

### OAuth Not Working:
1. Check HubSpot redirect URI matches exactly
2. Check environment variables are set
3. Check logs for errors
4. Verify production OAuth app scopes

### Database Errors:
1. Check Supabase credentials
2. Verify RLS policies are enabled
3. Check network requests in browser DevTools

### Build Failures:
1. Check build logs in Vercel
2. Run `npm run build` locally first
3. Check for TypeScript errors

### AI Not Working:
1. Verify GEMINI_API_KEY is set
2. Check API quota at https://aistudio.google.com/
3. Check Vercel function logs

---

## Production Checklist

Before launch:
- [ ] All environment variables configured
- [ ] Production HubSpot OAuth app created
- [ ] Redirect URIs updated
- [ ] Full user flow tested
- [ ] Database migrations deployed
- [ ] Error tracking set up (optional)
- [ ] Analytics added (optional)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (auto with Vercel)

---

## Quick Deploy Commands

```bash
# First time deploy
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Check deployment status
vercel ls

# Open in browser
vercel open
```

---

## Next Steps After Deployment

1. **Monitor First Users:**
   - Check Vercel logs regularly
   - Watch for errors
   - Collect feedback

2. **Marketing:**
   - Share on LinkedIn
   - Post in RevOps communities
   - DM potential users

3. **Iterate:**
   - Add requested features
   - Fix bugs quickly
   - Improve based on usage data

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- HubSpot OAuth: https://developers.hubspot.com/docs/api/oauth
- Supabase Docs: https://supabase.com/docs

---

**Your app is production-ready! Let's get it live! 🚀**
