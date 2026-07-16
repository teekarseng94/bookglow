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

1. **One-time:** link the hosting target to your Firebase site:
   ```bash
   firebase target:apply hosting booking-site zenspabookingsystem
   ```
   (Use your actual Hosting site ID if different; default is usually the project ID.)

2. Build and deploy:
   ```bash
   npm run build
   firebase deploy --only hosting:booking-site
   ```
