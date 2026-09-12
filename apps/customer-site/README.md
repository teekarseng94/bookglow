# Bookglow Customer Site

Customer booking and marketing site for Bookglow.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy (Booking site)

Production customer hosting is Vercel: `https://bookglow.vercel.app`.

Firebase Hosting is legacy frontend only. Firebase Functions remain on Firebase:

```bash
npm run deploy:functions
```

Legacy Firebase Hosting (not production):

```bash
npm run deploy:hosting:legacy
```
