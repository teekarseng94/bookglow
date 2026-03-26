# Troubleshooting Login Issues

## "Invalid email or password" Error

If you're seeing "Invalid email or password" when trying to login, follow these steps:

### Step 1: Verify User Exists in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **razak-residence-2026**
3. Navigate to **Authentication** → **Users** tab
4. Check if your user email appears in the list
5. If NOT, create the user:
   - Click **Add user**
   - Enter email: `admin@zenflow.test`
   - Enter password: `admin123`
   - Click **Add user**

### Step 2: Verify Email/Password Authentication is Enabled

1. In Firebase Console → **Authentication**
2. Go to **Sign-in method** tab
3. Click on **Email/Password**
4. Make sure **Email/Password** is **Enabled** (toggle ON)
5. If disabled, enable it and click **Save**

### Step 3: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Try to login again
4. Look for any error messages
5. Common errors:
   - `auth/operation-not-allowed` → Email/Password not enabled
   - `auth/user-not-found` → User doesn't exist
   - `auth/invalid-credential` → Wrong credentials
   - `auth/network-request-failed` → Connection issue

### Step 4: Verify Credentials

Make sure you're using:
- **Email:** `admin@zenflow.test` (exact, case-sensitive)
- **Password:** `admin123` (exact)

**Common mistakes:**
- Extra spaces before/after email
- Wrong email domain
- Typo in password
- Using wrong credentials

### Step 5: Check Firebase Configuration

Verify `firebase.ts` has correct configuration:
- Project ID: `razak-residence-2026`
- Auth Domain: `razak-residence-2026.firebaseapp.com`

### Step 6: Clear Browser Cache

1. Clear browser cache and cookies
2. Try in incognito/private mode
3. Try a different browser

## Quick Fix Checklist

✅ User exists in Firebase Console → Authentication → Users
✅ Email/Password authentication is enabled
✅ Using correct email: `admin@zenflow.test`
✅ Using correct password: `admin123`
✅ No extra spaces in email field
✅ Internet connection is working
✅ Browser console shows no errors

## Common Error Messages & Solutions

### "No account found with this email address"
**Solution:** Create the user in Firebase Console first

### "This operation is not allowed"
**Solution:** Enable Email/Password in Firebase Console → Authentication → Sign-in method

### "Network error"
**Solution:** Check internet connection, firewall, or VPN

### "Too many failed attempts"
**Solution:** Wait a few minutes, then try again

### "Invalid email address format"
**Solution:** Check email format (must include @)

## Still Having Issues?

1. **Check Firebase Console:**
   - Verify Authentication is enabled
   - Check Users tab for your email
   - Verify Sign-in methods

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for Firebase errors
   - Check Network tab for failed requests

3. **Try Creating a New User:**
   - Create a different test user
   - Use a different email
   - Try logging in with new credentials

4. **Verify Firebase Project:**
   - Make sure you're using the correct project
   - Check project ID matches: `razak-residence-2026`

## Test Credentials (Create in Firebase Console)

**Default Test User:**
- Email: `admin@zenflow.test`
- Password: `admin123`

**Alternative Test User:**
- Email: `test@zenflow.test`
- Password: `test123`

---

**Remember:** Users must be created in Firebase Console before they can login!
