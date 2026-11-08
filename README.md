# Fish Farm Ledger - deploy files
Upload ALL of these files (not the folder) to the root of a GitHub repository, then turn on GitHub Pages
(Settings > Pages > Deploy from a branch > main > / (root)).

- index.html            the app
- config.js             put your Supabase URL + anon key here
- cloud.js              Supabase email-OTP login + cloud sync (does nothing until config.js is filled)
- supabase.sql          run once in Supabase SQL Editor (safe to run again)
- manifest.webmanifest  makes it installable on the phone home screen / APK
- sw.js                 offline support
- icon-192.png, icon-512.png   app icons

Supabase email template: Authentication > Email Templates > "Magic Link" AND "Confirm signup"
-> make the body contain {{ .Token }} so the email shows the login code.

Notes
- Sales, expenses, notes text, settings sync between phones. Photos and attached files stay on the phone they were added on.
- Signing in with a different email on the same phone clears the previous account's local data first.
