# HANS TECHY Website

Static frontend for the HANS TECHY WhatsApp bot portal.

## Preview locally
Open `index.html` in a browser.

## Deploy on Vercel
1. Open https://vercel.com/ and sign in.
2. Choose **Add New → Project**.
3. Import the GitHub repository `hanstechy1/HANS-TECHY`.
4. Set **Root Directory** to `website`.
5. For this static starter, use no build command and set the output directory to `.` if Vercel asks for it.
6. Click **Deploy**.

## Configure Environment Variables in Vercel

Environment variables are private configuration values for server-side code. To add one:

1. Open your project in the Vercel dashboard.
2. Go to **Settings → Environment Variables**.
3. Under **Key**, enter `ADMIN_TOKEN`.
4. Under **Value**, enter the same admin token configured for your Render bot. Enter it directly in Vercel; do not send it to anyone or add it to GitHub.
5. Select **Production**. Select **Preview** or **Development** only if you also need the variable in those environments.
6. Click **Save**.
7. Redeploy the project so the new variable is available to the deployment.

**Important:** This website is currently a static frontend. Adding `ADMIN_TOKEN` in Vercel by itself does not connect the QR Code or Pair Code buttons to the protected Render endpoints. A server-side Vercel API route must be implemented to read `ADMIN_TOKEN` securely and forward the correct requests to Render. Do not put the token in `index.html`, browser JavaScript, or public variables such as `NEXT_PUBLIC_ADMIN_TOKEN` or `VITE_ADMIN_TOKEN`.

## Current integration status

This frontend links to the Render service at https://hans-techy-yjo2.onrender.com. The Render endpoints `/qr` and `/pair` are protected by `ADMIN_TOKEN`. The static frontend intentionally does not embed that secret. The complete QR/Pair Code flow still requires secure server-side proxy routes and verification of the backend request/response contract.
