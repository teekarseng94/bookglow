<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1f4y4l-GXcD-Hx9xjiY6iEtX1zoker1MJ

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
