# Image Upload: CORS Error Fix (Two Options)

If image uploads in **Catalog Management** fail with a CORS error in the browser (e.g. "blocked by CORS policy"), use one of these approaches.

---

## Option A: Use Cloud Functions (Recommended – No CORS Needed)

Uploads go through a **Callable Cloud Function** instead of directly to Storage, so the browser never hits Storage and CORS is not required.

### 1. Deploy the functions (one-time)

From the **project root**:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 2. Use the app

The app is already set up to use the callable functions `uploadServiceImage` and `deleteStorageFile`. After deploying functions, image upload and delete in Catalog Management should work without any CORS configuration.

### 3. Deploy hosting after functions

When you update the app:

```bash
npm run build
firebase deploy --only hosting
```

To deploy both hosting and functions:

```bash
npm run build
firebase deploy
```

---

## Option B: Set CORS on the Storage Bucket

If you prefer **not** to use Cloud Functions, you can allow direct uploads by configuring CORS on the Storage bucket.

### 1. Install Google Cloud SDK (or use [Cloud Shell](https://shell.cloud.google.com/))

### 2. Log in and set project

```bash
gcloud auth login
gcloud config set project razak-residence-2026
```

### 3. Apply CORS from project root

```bash
gcloud storage buckets update gs://razak-residence-2026.firebasestorage.app --cors-file=storage-cors.json
```

If your bucket name is different (e.g. `razak-residence-2026.appspot.com`), use that. Check: [Firebase Console](https://console.firebase.google.com/) → Project → **Storage** → bucket name at the top.

### 4. Retry upload

Wait a minute, then try uploading an image again in Catalog Management.

---

## Summary

| Approach | Pros | Cons |
|----------|------|------|
| **Option A: Cloud Functions** | No CORS setup; works immediately after `firebase deploy --only functions` | Requires deploying functions (Node 18); upload goes through your project |
| **Option B: CORS on bucket** | No functions to deploy | Requires gcloud and one-time CORS config on the bucket |

The app is configured to use **Option A** (callable functions) by default. Deploy functions once and image uploads should work.
