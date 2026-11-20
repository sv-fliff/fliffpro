# Fliff Pro prototype (PWA)

A password-gated, installable copy of the Fliff Pro design prototype (v3.1.0).

## Files

- `index.html` is the whole prototype, with the password splash and home-screen tags.
- `manifest.webmanifest` holds the app name, colours and icons for Add to Home Screen.
- `sw.js` makes the app open offline. New deploys show up on the next open.
- `icons/` holds the home-screen and favicon images.
- `vercel.json` sets the caching headers and asks search engines not to index the site.

## Deploy on Vercel

1. Put these files at the root of the repo (`sv-fliff/fliffpro`) and push.
2. In Vercel, import the repo. It's a static site, so use Framework "Other" with no build command and output directory `./`.
3. Open the deployment URL on your phone.
4. Optional, recommended: turn on Vercel Deployment Protection (Settings → Deployment Protection) so only your team can load the site at all.

## Install on your phone

- **iPhone:** open the URL in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open the URL in Chrome, tap ⋮, then **Install app** (or Add to Home screen).

The app then opens full screen from its own icon.

## Password

The splash asks for the team password. "Remember this device" keeps it unlocked on that phone. Untick it to be asked every time the app is opened fresh.

The password is checked against a hash, so it isn't written in the page. This keeps casual visitors out, but anyone who downloads the file could remove the gate. For real privacy use Deployment Protection (above).

## Updating

Replace `index.html` with the newest prototype build and push. Bump `V` in `sw.js` when the icons or manifest change.
