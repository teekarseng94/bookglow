# Firebase Deployment Guide

## Prerequisites

1. **Firebase CLI installed**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Logged into Firebase**:
   ```bash
   firebase login
   ```

3. **Project initialized** (already done):
   - Project ID: `razak-residence-2026`
   - Firestore configured
   - Hosting configured

## Deployment Steps

### Step 1: Build Your Application

Build your Vite application for production:

```bash
npm run build
```

This will create a `dist` folder with optimized production files.

### Step 2: Deploy to Firebase Hosting

#### Option A: Deploy Only Hosting (Recommended for first deployment)

```bash
firebase deploy --only hosting
```

#### Option B: Use the npm script

```bash
npm run deploy
```

#### Option C: Deploy Everything (Hosting + Firestore)

```bash
npm run deploy:all
```

or

```bash
firebase deploy
```

### Step 3: Verify Deployment

After deployment, Firebase will provide you with a hosting URL like:
```
https://razak-residence-2026.web.app
```
or
```
https://razak-residence-2026.firebaseapp.com
```

Visit the URL to verify your app is live!

## Deployment Commands Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build the app for production |
| `npm run deploy` | Build and deploy to hosting only |
| `npm run deploy:all` | Build and deploy everything |
| `firebase deploy --only hosting` | Deploy hosting only |
| `firebase deploy --only firestore` | Deploy Firestore rules/indexes only |
| `firebase deploy` | Deploy everything |

## Troubleshooting

### Issue: "Cannot understand what targets to deploy"

**Solution**: Make sure `firebase.json` includes the hosting configuration. It should look like:
```json
{
  "hosting": {
    "public": "dist",
    ...
  }
}
```

### Issue: "dist folder not found"

**Solution**: Run `npm run build` first to create the dist folder.

### Issue: "Permission denied"

**Solution**: 
1. Make sure you're logged in: `firebase login`
2. Verify you have access to the project: `firebase projects:list`
3. Check your project: `firebase use razak-residence-2026`

### Issue: "Build fails"

**Solution**:
1. Check for TypeScript errors: `npm run build`
2. Fix any linting errors
3. Ensure all dependencies are installed: `npm install`

### Issue: "404 errors on routes"

**Solution**: The `firebase.json` already includes a rewrite rule to serve `index.html` for all routes. This is correct for SPAs.

## Continuous Deployment

### Using GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: razak-residence-2026
```

## Environment Variables

If you have environment variables, create a `.env.production` file:

```env
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-domain
# etc.
```

These will be included in the build.

## Post-Deployment Checklist

- [ ] App loads correctly at the Firebase hosting URL
- [ ] All routes work (no 404 errors)
- [ ] Firestore connection works
- [ ] Authentication works (if implemented)
- [ ] Images and assets load correctly
- [ ] Mobile responsiveness works
- [ ] Performance is acceptable

## Updating Your Deployment

To update your app:

1. Make your changes
2. Test locally: `npm run dev`
3. Build: `npm run build`
4. Preview build: `npm run preview`
5. Deploy: `npm run deploy`

## Firebase Hosting Features

Your `firebase.json` is configured with:

- ✅ **SPA Routing**: All routes redirect to `index.html`
- ✅ **Caching**: Static assets cached for 1 year
- ✅ **Firestore**: Rules and indexes deployment ready

## Custom Domain (Optional)

To use a custom domain:

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the DNS configuration instructions
4. Wait for SSL certificate provisioning (automatic)

## Rollback

If you need to rollback:

```bash
firebase hosting:channel:list
firebase hosting:channel:rollback <channel-id>
```

Or in Firebase Console:
1. Go to Hosting → Releases
2. Find the previous version
3. Click "Rollback"

---

**Your app is now ready to deploy!** 🚀

Run `npm run deploy` to get started.
