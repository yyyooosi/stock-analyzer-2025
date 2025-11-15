# 🔴 URGENT: X API Setup Required

## Current Status

❌ **Your Bearer Token is returning 403 "Access denied" errors**

The diagnostic test confirms:
- ✅ Token format is correct (116 characters)
- ❌ Token is not working on ANY endpoint (even basic ones)
- 🔍 **Root Cause**: App is not properly configured in X Developer Portal

## What You Need To Do RIGHT NOW

### ⚡ Quick Fix (5 minutes)

1. **Open X Developer Portal**
   - Go to: https://developer.twitter.com/en/portal/dashboard
   - Log in with your X account

2. **Check Your App Location**
   - Look at the left sidebar under "Projects & Apps"
   - **Question**: Do you see a PROJECT with your app inside it?
   - Or do you see a **standalone app** (not in a project)?

3. **If Standalone App → Create Project**

   Your app MUST be inside a Project for X API v2 to work:

   a. Click **"+ Create Project"**

   b. Fill in:
      - Name: `Stock Analyzer Project`
      - Use case: `Making a bot` or `Exploring the API`
      - Description: `Stock crash prediction using tweet sentiment`

   c. Click through the wizard

   d. **Add App**: When asked, select your existing app OR create a new one

4. **Regenerate Bearer Token**

   **CRITICAL**: After adding app to project, you MUST regenerate the token

   a. Go to your app → **"Keys and tokens"** tab

   b. Find **"Bearer Token"** section

   c. Click **"Regenerate"**

   d. **COPY THE NEW TOKEN** (you won't see it again!)

   e. Should look like: `AAAAAAAAAAAAAAAAAAAAAxxxxxx...` (~115 chars)

5. **Update .env.local**

   Replace the token in `/home/user/stock-analyzer-2025/.env.local`:

   ```bash
   NEXT_PUBLIC_TWITTER_BEARER_TOKEN=YOUR_NEW_REGENERATED_TOKEN_HERE
   ```

6. **Test Again**

   ```bash
   bash /tmp/diagnose_x_api.sh
   ```

   Should see: ✅ SUCCESS!

## If You See Different Screens

### Option A: You see "Elevated Access" or "Essential Access"

This is GOOD! You already have a project. Just:
1. Make sure app permissions are set to **"Read"**
2. Regenerate your Bearer Token
3. Copy the new token to .env.local

### Option B: Asked to verify phone number

X requires phone verification for API access:
1. Add your phone number
2. Verify it
3. Then create project

### Option C: Confused about projects vs apps

- **Project** = Container (like a folder)
- **App** = The actual application (must be inside a project)
- X API v2 requires: App → inside → Project

## Current Workaround (While Fixing)

Your app already has **demo mode** built in! It shows sample tweets while you fix the API:

1. In your deployed app: https://stock-analyzer-2025-huzw.vercel.app/
2. **Toggle OFF** the "実データを使用" (Use Real Data) switch
3. Demo mode will show sample tweets for testing

The UI and analysis work perfectly in demo mode!

## Free Tier Limits (After Fix)

Once working, you'll have:
- ✅ Recent Search: 1 request per 15 minutes
- ✅ 100 tweets per request
- ✅ 1,500 tweet posts per month

**For your use case**: This is enough to analyze tweets every 15 minutes (96 times/day)

## Why This Happened

X changed their API requirements in 2023:
- **Old way**: Standalone apps worked
- **New way**: Apps must be in Projects
- Your token was generated from a standalone app (or misconfigured project)

## After You Fix It

1. ✅ Get new Bearer Token from project app
2. Update `.env.local` locally and test
3. Update Vercel environment variable:
   - Go to: https://vercel.com/yyoos-projects/stock-analyzer-2025-huzw/settings/environment-variables
   - Update `NEXT_PUBLIC_TWITTER_BEARER_TOKEN`
4. Redeploy (Vercel auto-deploys on push)
5. Toggle ON "実データを使用" in the app
6. See real tweets! 🎉

## Need Help?

Run the diagnostic tool anytime:
```bash
bash /tmp/diagnose_x_api.sh
```

Read detailed setup guide:
```bash
cat /home/user/stock-analyzer-2025/X_API_SETUP_GUIDE.md
```

## Summary

🔴 **Problem**: App not in Project → Bearer Token doesn't work
✅ **Solution**: Add app to Project → Regenerate token → Update .env.local
⏱️ **Time**: ~5 minutes
🎯 **Goal**: See ✅ SUCCESS when running diagnostic script
