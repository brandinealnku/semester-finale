# INF 286 Demo Day (GitHub Pages Ready)

A multi-device finale experience with:

- Host control panel (`host.html`)
- Audience companion view (`audience.html`)
- Firebase Realtime Database sync
- Real synchronized countdown
- Cinematic visuals + stronger stage animations
- Host-triggered audience audio mode (build-up / drop)

## Quick start

1. Configure Firebase keys in `js/firebase-config.js`.
2. Deploy to GitHub Pages (repo root) or run any static file server.
3. Open `host.html?session=<id>` on host laptop.
4. Share `audience.html?session=<id>` with students.

## GitHub Pages deployment

1. Push this repo to GitHub.
2. In **Settings → Pages**, choose deployment from `main` branch root.
3. Wait for build to finish.
4. Open:
   - `https://<username>.github.io/<repo>/host.html`
   - `https://<username>.github.io/<repo>/audience.html`

## Production notes

- Use unique `session` query strings per class/demo.
- Keep host tab active for best synchronization.
- Audience browsers need one user gesture (`Join Session`) to enable WebAudio playback.

## Security hardening (required for production)

This app now signs users in with Firebase Anonymous Auth and expects locked-down Realtime Database rules.

1. Enable **Anonymous** sign-in in Firebase Authentication.
2. Deploy rules from `database.rules.json`:
   ```bash
   firebase deploy --only database
   ```
3. On host page, click **Claim Host Controls** before running stage actions.

Why: Firebase web config values are public identifiers in browser apps; data security comes from Auth + Rules.
