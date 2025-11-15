# X API Setup Guide - Fixing 403 Access Denied Errors

## Problem Diagnosis
Your Bearer Token returns **403 "Access denied"** errors even for basic endpoints. This indicates an **app configuration issue**, not an access level issue.

## Most Likely Cause
**Your app is not attached to a Project in the X Developer Portal.**

X API v2 requires all apps to be attached to a Project. Standalone apps will get 403 errors.

## Step-by-Step Solution

### Step 1: Verify Your App is in a Project

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Click on **"Projects & Apps"** in the left sidebar
3. You should see a **Project** (not just a standalone app)
4. Your app should be **under** a project, not separate

#### If you only see a standalone app:
- You need to create a Project first
- Then attach your app to that project

### Step 2: Create a Project (if needed)

1. Click **"+ Add Project"** or **"Create Project"**
2. Fill in project details:
   - Project name: "Stock Analyzer"
   - Use case: Select appropriate category
   - Project description: "Stock crash prediction using tweet sentiment"
3. Click **"Next"** until project is created

### Step 3: Create or Move App to Project

1. Inside your project, create a new app or move existing app
2. App name: "stock-analyzer-app" (or your choice)
3. Note down:
   - **API Key** (Consumer Key)
   - **API Key Secret** (Consumer Secret)
   - **Bearer Token** ← This is what we need

### Step 4: Configure App Permissions

1. In your app settings, go to **"Settings"** tab
2. Under **"App permissions"**, make sure:
   - Type of App: **"Read"** (for fetching tweets)
   - If it says "Read and Write" or "Write", that's also fine
3. Click **"Save"**

### Step 5: Generate Bearer Token

**IMPORTANT**: After creating/moving the app, you need to regenerate the Bearer Token

1. Go to your app → **"Keys and tokens"** tab
2. Under **"Bearer Token"**, click **"Regenerate"**
3. Copy the new Bearer Token (starts with "AAAAA..." and is ~115 characters)
4. Save it immediately - you can't view it again!

### Step 6: Update .env.local

Replace the Bearer Token in `.env.local`:

```bash
NEXT_PUBLIC_TWITTER_BEARER_TOKEN=YOUR_NEW_BEARER_TOKEN_HERE
```

### Step 7: Verify Access Level

1. In your Project, check the **Access level**
2. You should see **"Free"** tier
3. Free tier includes:
   - ✅ Recent Search (1 request per 15 minutes)
   - ✅ User lookup
   - ✅ Tweet posting (1,500 tweets/month)

## Testing Your Setup

Run this test script:

```bash
bash /tmp/test_new_token.sh
```

**Expected result**: HTTP 200 with tweet data

**If still 403**: The app is still not properly in a project

## Free Tier Limitations

- **Recent Search**: 1 request per 15 minutes (vs 60/15min on Basic tier)
- **Tweet limit**: 1,500 tweets per month
- **Max results**: 100 tweets per request

For your use case (crash prediction), this is sufficient for:
- Checking every 15 minutes (96 times/day)
- Getting 100 tweets per search
- ~9,600 tweets analyzed per day

## Alternative: Use OAuth 1.0a

If Bearer Token continues to fail, we can switch to OAuth 1.0a (User Context):
- Provides better access to endpoints
- Requires API Key, API Secret, Access Token, Access Token Secret
- More complex but more reliable

## Next Steps After Fixing

1. ✅ Get Bearer Token working
2. Update Vercel environment variable: `NEXT_PUBLIC_TWITTER_BEARER_TOKEN`
3. Deploy to Vercel
4. Test real tweet data display

## Common Mistakes

❌ **Wrong**: Standalone app (not in project)
✅ **Right**: App inside a Project

❌ **Wrong**: Using old token after moving app
✅ **Right**: Regenerate token after any app changes

❌ **Wrong**: Missing app permissions
✅ **Right**: "Read" permission enabled

## Reference Links

- X Developer Portal: https://developer.twitter.com/en/portal/dashboard
- API Documentation: https://developer.twitter.com/en/docs/twitter-api
- Rate Limits: https://developer.twitter.com/en/docs/twitter-api/rate-limits
