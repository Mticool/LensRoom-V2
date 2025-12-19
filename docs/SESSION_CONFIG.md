# Session Configuration

## Overview

The application uses Supabase authentication with extended session management to keep users logged in for longer periods.

## Session Lifetime

| Token Type | Lifetime | Auto-Refresh |
|------------|----------|--------------|
| **Access Token** | 1 hour | ✅ Yes (automatic) |
| **Refresh Token** | 30 days | ✅ Yes (when access expires) |
| **Cookie** | 30 days | Matches refresh token |

## How It Works

### Client-Side (Browser)

1. **Initial Login**
   - User signs in via Google/Telegram
   - Supabase creates access + refresh tokens
   - Tokens stored in `localStorage` (persists across tabs)
   - Cookie set with 30-day expiry

2. **Active Session**
   - Access token valid for 1 hour
   - Before expiry (< 5 min), Supabase auto-refreshes using refresh token
   - User stays logged in seamlessly
   - No logout/redirect required

3. **Inactive Session (30+ days)**
   - Refresh token expires after 30 days of inactivity
   - User must log in again

### Server-Side (Next.js)

- Server reads auth cookies on each request
- Validates session with Supabase
- Auto-refreshes if needed (transparent to user)
- Cookies set with 30-day `maxAge`

## Configuration Details

### Client (`src/lib/supabase/client.ts`)

```typescript
{
  auth: {
    persistSession: true,        // Keep session across browser restarts
    autoRefreshToken: true,      // Auto-refresh before expiry
    detectSessionInUrl: true,    // Handle OAuth callbacks
    flowType: 'pkce',           // Secure auth flow
    storage: localStorage,       // Persist in browser storage
  }
}
```

### Server (`src/lib/supabase/server.ts`)

```typescript
{
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  cookies: {
    maxAge: 60 * 60 * 24 * 30,  // 30 days
    sameSite: 'lax',
    secure: production,
  }
}
```

## User Experience

✅ **User stays logged in for 30 days** (even if browser closes)  
✅ **No "Session expired" popups** during active use  
✅ **Seamless token refresh** every hour (invisible to user)  
✅ **Cross-tab sync** via localStorage events  
✅ **Secure** - tokens refresh automatically, never exposed

## Troubleshooting

### User Gets Logged Out Frequently

**Possible causes:**
1. Browser clearing localStorage/cookies
2. Private/incognito mode (session not persisted)
3. Server-side cookie issues

**Solution:**
- Check browser settings (allow cookies from site)
- Disable "Clear cookies on exit"
- Ensure `maxAge` in server cookies is set correctly

### Token Not Auto-Refreshing

**Check:**
- `autoRefreshToken: true` in both client and server config
- Network tab: look for `/token?grant_type=refresh_token` calls
- Console: check for Supabase auth errors

**Expected behavior:**
- ~5 minutes before access token expiry, Supabase calls refresh endpoint
- New access token issued silently
- User session continues without interruption

## Security Notes

- Refresh tokens stored securely in httpOnly cookies (server)
- Access tokens in localStorage (client, short-lived)
- PKCE flow prevents token interception
- Tokens auto-rotate on refresh (old token invalidated)

## Testing Session Duration

```bash
# 1. Log in
# 2. Check localStorage:
localStorage.getItem('sb-<project-ref>-auth-token')

# 3. Wait 1+ hour (or manually expire access token)
# 4. Make an API request
# 5. Check Network tab - should see automatic refresh call
# 6. Verify session continues without logout
```

## Configuration Changes

To adjust session duration:

**Client/Server:**
- `autoRefreshToken`: Keep `true` (recommended)
- `persistSession`: Keep `true` (recommended)

**Server cookies:**
- Change `maxAge: 60 * 60 * 24 * X` to desired days
- Must match or exceed Supabase refresh token expiry

**Supabase Dashboard:**
- Project Settings → Authentication → JWT Expiry
- Default: 3600s (1 hour) access, 2592000s (30 days) refresh
- Can be increased for longer sessions
