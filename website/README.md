# HANS TECHY website

Static frontend for the HANS TECHY WhatsApp bot portal.

## Preview locally
Open `index.html` in a browser.

## Deploy on Vercel
1. Import repository `hanstechy1/HANS-TECHY` into Vercel.
2. Set the project Root Directory to `website`.
3. Deploy as a static site (no build command; output directory `.`).

## Important integration/security note
This is a frontend starter. It links to the existing Render service at https://hans-techy-yjo2.onrender.com. The current Render endpoints `/qr` and `/pair` are protected by `ADMIN_TOKEN`; this static frontend intentionally does not embed that secret. For fully integrated QR/Pair Code flows, add server-side Vercel API proxy routes that read `ADMIN_TOKEN` from a server-only environment variable and verify the exact backend request/response contract. Never name the variable `VITE_ADMIN_TOKEN` or `NEXT_PUBLIC_ADMIN_TOKEN`. Do not deploy this page as if protected QR/Pair Code actions already work directly from Vercel.
