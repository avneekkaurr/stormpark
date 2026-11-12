# StormPark 🅿️

**Live demo:** [stormpark.vercel.app](https://stormpark.vercel.app)

StormPark is a real-time campus parking web app for St. John's University students. It shows live open-spot counts for campus lots on an interactive map, and students can check in when they park and check out when they leave.

> Independent student project — not affiliated with or endorsed by St. John's University. Spot counts are crowdsourced and may not reflect official availability.

## Features

- **Live map** of 8 campus lots and garages, color-coded by availability
  - 🟢 open · 🔴 full · ⚪ faculty/staff only
- **Real-time updates.** Counts change instantly for every user without refreshing.
- **Google sign-in** with Firebase Authentication
- **Check in / check out.** Students update counts when they park or leave.
- **One active check-in per user**, enforced on the server

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React, Vite, Leaflet + OpenStreetMap |
| Backend | Firebase Realtime Database, Firebase Authentication |
| Security | Firebase Security Rules, Firebase App Check (reCAPTCHA Enterprise) |
| Hosting | Vercel (auto-deploys from GitHub) |

## Security Design

The goal was to make the app safe even if someone bypasses the UI and talks to the database directly. **The client is never trusted. Every rule is enforced on the server.**

**Authentication**
- Anyone can read lot counts. Only signed-in users can change them.

**Server-side validation (Firebase Security Rules)**
- Users can change only the `open` count. Lot names, locations, and access types are read-only.
- Counts can change by exactly ±1 per update and can never go below 0.
- Faculty/staff lots can't be modified by student check-ins.

**One check-in per user**
- Each user's active check-in is stored at `checkins/{uid}`.
- Parking (−1) is only allowed if the user has no active check-in, and it must create one in the same atomic update.
- Leaving (+1) is only allowed at the lot the user is checked into, and it must delete the check-in in the same update.
- A check-in can't be deleted without freeing its spot, which blocks the "delete and re-park" exploit.
- Users can read and write only their own check-in.
- Check-in timestamps use the server clock, and future timestamps are rejected.

**App Check**
- Requests must come from the real StormPark site (verified with reCAPTCHA Enterprise), not from scripts that copied the Firebase config.

**Secrets management**
- Config lives in environment variables (`.env.local` locally, Vercel settings in production), and nothing sensitive is committed to Git.
- Local development uses an App Check debug token that is never committed.

**Data minimization**
- The app stores only lot counts and each user's single active check-in. It keeps no location history and no tracking.

## Data Model

```
lots/
  {lotId}: { name, type, access, label, open, lat, lng }
checkins/
  {uid}: { lotId, time }
```

## Run Locally

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/avneekkaurr/stormpark.git
   cd stormpark
   npm install
   ```
2. Create a `.env.local` file in the project root:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_RECAPTCHA_SITE_KEY=...
   VITE_APPCHECK_DEBUG_TOKEN=...
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Roadmap

- [ ] Auto-expire forgotten check-ins after a few hours
- [ ] Push notifications when a full lot opens up
- [ ] Student / faculty filter toggle
- [ ] Per-floor counts for garages

## Author

Built by Avneek Kaur, cybersecurity student at St. John's University.