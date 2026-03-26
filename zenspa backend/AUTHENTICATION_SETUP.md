# Firebase Authentication Setup Guide

## Overview

Your ZenFlow SPA Manager now includes a professional Login UI with Firebase Authentication. This guide will help you set up authentication in your Firebase project.

## Step 1: Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `razak-residence-2026`
3. Navigate to **Authentication** in the left sidebar
4. Click **Get Started** (if you haven't enabled Authentication yet)
5. Go to the **Sign-in method** tab
6. Click on **Email/Password**
7. Enable **Email/Password** (toggle ON)
8. Optionally enable **Email link (passwordless sign-in)** if desired
9. Click **Save**

## Step 2: Create Your First User

### ⚡ Quick Setup - Default Test Credentials

**For easy localhost testing, create this user:**

1. In Firebase Console → **Authentication** → **Users** tab
2. Click **Add user**
3. Enter these credentials:
   - **Email:** `admin@zenflow.test`
   - **Password:** `admin123`
4. Click **Add user**

**Now you can login at `http://localhost:5173` or `http://localhost:5175` with:**
- Email: `admin@zenflow.test`
- Password: `admin123`

### Option A: Via Firebase Console (Recommended for Testing)

1. In Firebase Console → **Authentication** → **Users** tab
2. Click **Add user**
3. Enter an email and password (or use the default credentials above)
4. Click **Add user**
5. Note down the credentials for testing

### Option B: Via Your App (After Deployment)

1. You'll need to create a registration page or use Firebase Console
2. For now, create users via Firebase Console

## Step 3: Test the Login

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173`
3. You should see the Login page
4. Enter the credentials you created
5. Click **Sign In**
6. You should be redirected to the dashboard

## Features Implemented

✅ **Professional Login UI**
- Clean, centered design with gradient background
- Email and password fields with icons
- Responsive design (mobile-friendly)
- Loading spinner during authentication
- Error handling with user-friendly messages

✅ **Firebase Authentication**
- Email/Password authentication
- Password reset functionality
- Auth state persistence
- Automatic session management

✅ **User Experience**
- Toast notifications for success/error messages
- Loading states on buttons
- Form validation
- "Forgot Password" flow
- Logout functionality in header

✅ **Security**
- Protected routes (app only accessible when authenticated)
- Automatic redirect to login when not authenticated
- Session persistence across page refreshes

## Login Page Features

### Main Login Form
- Email input field with validation
- Password input field
- "Forgot Password?" link
- Sign In button with loading state

### Forgot Password Flow
- Click "Forgot Password?" link
- Enter email address
- Receive password reset email
- Reset password via email link

### Error Handling
- Invalid email/password → Clear error message
- Network errors → User-friendly notification
- Too many attempts → Rate limiting message
- All errors displayed via Toast notification

## Customization

### Change Login Page Styling

Edit `pages/Login.tsx`:
- Modify colors in Tailwind classes
- Change logo/icon
- Adjust card size and spacing
- Update background gradient

### Change Error Messages

Edit `services/authService.ts`:
- Modify the `getErrorMessage()` function
- Add custom error messages for specific error codes

### Add Registration

To add user registration:
1. Create a `pages/Register.tsx` component
2. Use Firebase `createUserWithEmailAndPassword()` in `authService.ts`
3. Add route/navigation to registration page

## Troubleshooting

### Issue: "Firebase: Error (auth/operation-not-allowed)"
**Solution**: Enable Email/Password authentication in Firebase Console (Step 1)

### Issue: "Firebase: Error (auth/user-not-found)"
**Solution**: Create a user account first (Step 2)

### Issue: Login page doesn't show
**Solution**: 
- Check if Firebase Auth is properly initialized
- Verify `firebase.ts` exports `auth`
- Check browser console for errors

### Issue: Can't logout
**Solution**: 
- Verify logout function is called
- Check Firebase Console → Authentication → Users
- Clear browser cache and try again

### Issue: Stuck on loading screen
**Solution**:
- Check Firebase configuration in `firebase.ts`
- Verify internet connection
- Check browser console for errors
- Ensure Firestore is enabled

## Security Best Practices

1. **Enable Email Verification** (Optional but Recommended):
   - In Firebase Console → Authentication → Settings
   - Enable "Email verification"
   - Users must verify email before accessing app

2. **Set Password Requirements**:
   - Firebase enforces minimum 6 characters
   - Consider adding client-side validation for stronger passwords

3. **Enable Rate Limiting**:
   - Firebase automatically rate-limits failed login attempts
   - Consider adding CAPTCHA for additional protection

4. **Use Environment Variables** (For Production):
   - Move Firebase config to environment variables
   - Never commit API keys to version control

## Next Steps

1. ✅ Enable Email/Password authentication in Firebase Console
2. ✅ Create test user accounts
3. ✅ Test login functionality
4. ✅ Customize login page styling (optional)
5. ✅ Deploy and test in production

## Default Test Credentials for Localhost

### 🚀 Quick Start - Use These Credentials

**Create this user in Firebase Console for easy testing:**

| Field | Value |
|-------|-------|
| **Email** | `admin@zenflow.test` |
| **Password** | `admin123` |

**Steps:**
1. Go to Firebase Console → Authentication → Users
2. Click "Add user"
3. Enter: `admin@zenflow.test` / `admin123`
4. Click "Add user"
5. Login at `http://localhost:5173` or `http://localhost:5175`

### Alternative Test Users

You can also create these users:

**Staff User:**
- Email: `staff@zenflow.test`
- Password: `staff123`

**Test User:**
- Email: `test@zenflow.test`
- Password: `test123`

⚠️ **Important:** These are TEST credentials only for localhost development. Do NOT use in production!

---

**Your authentication system is ready!** 🎉

Users must now log in before accessing the SPA Manager dashboard.
