# Quick Start Guide - Localhost Login

## 🚀 Default Login Credentials for Localhost

### Step 1: Create User in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **razak-residence-2026**
3. Go to **Authentication** → **Users** tab
4. Click **Add user**
5. Enter:
   - **Email:** `admin@zenflow.test`
   - **Password:** `admin123`
6. Click **Add user**

### Step 2: Login to Your App

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open browser:
   ```
   http://localhost:5173
   ```
   or
   ```
   http://localhost:5175
   ```

3. Login with:
   - **Email:** `admin@zenflow.test`
   - **Password:** `admin123`

4. Click **Sign In**

---

## ✅ That's It!

You should now be logged in and see the dashboard.

---

## 🔧 Troubleshooting

**Can't login?**
- Make sure you created the user in Firebase Console first
- Verify Email/Password authentication is enabled in Firebase Console
- Check browser console for errors

**Need help?**
- See `AUTHENTICATION_SETUP.md` for detailed setup
- See `DEFAULT_USER_CREDENTIALS.md` for more test user options

---

**Default Credentials:**
- Email: `admin@zenflow.test`
- Password: `admin123`
