# 🔧 Login Fix Checklist - Step by Step

Follow these steps in order to fix the "Invalid email or password" error:

## ✅ Step 1: Enable Email/Password Authentication

1. Go to: https://console.firebase.google.com/
2. Select project: **razak-residence-2026**
3. Click **Authentication** in left sidebar
4. Click **Get Started** (if first time)
5. Go to **Sign-in method** tab
6. Find **Email/Password** in the list
7. Click on **Email/Password**
8. Toggle **Enable** to **ON**
9. Click **Save**

**Status:** ☐ Email/Password enabled

---

## ✅ Step 2: Create Test User

1. In Firebase Console → **Authentication**
2. Go to **Users** tab
3. Click **Add user** button (top right)
4. Enter:
   - **Email:** `admin@zenflow.test`
   - **Password:** `admin123`
5. Click **Add user**
6. Verify user appears in the Users list

**Status:** ☐ User created in Firebase Console

---

## ✅ Step 3: Verify User Details

1. In Firebase Console → **Authentication** → **Users**
2. Find `admin@zenflow.test` in the list
3. Click on the user to view details
4. Verify:
   - Email is correct
   - Provider is "password"
   - User is not disabled

**Status:** ☐ User verified

---

## ✅ Step 4: Test Login

1. Open your app: `http://localhost:5173` or `http://localhost:5175`
2. Enter credentials:
   - **Email:** `admin@zenflow.test`
   - **Password:** `admin123`
3. Click **Sign In**
4. Check for errors

**Status:** ☐ Login tested

---

## ✅ Step 5: Check Browser Console

1. Open browser Developer Tools (Press F12)
2. Go to **Console** tab
3. Try to login again
4. Look for error messages
5. Common errors:
   - `auth/operation-not-allowed` → Go back to Step 1
   - `auth/user-not-found` → Go back to Step 2
   - `auth/invalid-credential` → Check credentials
   - `auth/network-request-failed` → Check internet

**Status:** ☐ Console checked

---

## ✅ Step 6: Verify Firebase Config

Check `firebase.ts` file has:
- Project ID: `razak-residence-2026`
- Auth Domain: `razak-residence-2026.firebaseapp.com`

**Status:** ☐ Config verified

---

## 🎯 Quick Test

After completing all steps, try this:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Open incognito/private window**
3. Go to: `http://localhost:5173`
4. Login with:
   - Email: `admin@zenflow.test`
   - Password: `admin123`

---

## 📋 Common Issues & Quick Fixes

| Issue | Solution |
|-------|----------|
| "Operation not allowed" | Enable Email/Password in Firebase Console |
| "User not found" | Create user in Firebase Console → Users |
| "Invalid credential" | Check email/password are correct |
| "Network error" | Check internet connection |
| Still not working | Check browser console for specific error |

---

## 🔍 Still Not Working?

1. **Double-check Firebase Console:**
   - Authentication → Sign-in method → Email/Password = Enabled ✅
   - Authentication → Users → User exists ✅

2. **Try different credentials:**
   - Create a new user with different email
   - Use: `test@zenflow.test` / `test123`

3. **Check Firebase project:**
   - Make sure you're in the correct project
   - Project ID should be: `razak-residence-2026`

4. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

---

**Most Common Cause:** User not created in Firebase Console!

Make sure you complete **Step 2** - Create the user in Firebase Console before trying to login.
