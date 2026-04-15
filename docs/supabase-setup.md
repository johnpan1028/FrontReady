# Supabase setup

## 1. Create / prepare a Supabase project
- Turn on `Email` auth in `Authentication -> Providers`.
- Optional but recommended: also turn on `GitHub` in `Authentication -> Sign In / Providers` so the builder can offer GitHub OAuth at startup.
- Keep `Confirm email` enabled for production-like testing.
- In `Authentication -> URL Configuration`, set:
  - `Site URL` to your local editor URL, for example `http://127.0.0.1:3000`
  - add `http://127.0.0.1:3000` and `http://localhost:3000` to `Redirect URLs`

## 1.1 Optional: enable GitHub OAuth
- In Supabase `Authentication -> Sign In / Providers -> GitHub`, copy the callback URL shown by Supabase.
- Create a GitHub OAuth App and set:
  - `Homepage URL` to your app URL, for example `http://127.0.0.1:3000`
  - `Authorization callback URL` to the Supabase callback URL
- Paste the GitHub `Client ID` and `Client secret` back into the Supabase GitHub provider config and save.
- After this, the builder account panel can start a `Continue with GitHub` flow directly from the app.

## 2. Run the builder schema
- Open `SQL Editor` in Supabase.
- Paste and run `docs/supabase-schema.sql`.
- If login still says a table is missing in the schema cache, run:
  - `NOTIFY pgrst, 'reload schema';`

## 3. Configure local env
- Copy `.env.example` to `.env.local`.
- Set:
  - `VITE_BUILDER_GATEWAY_MODE=supabase`
  - `VITE_SUPABASE_URL=...`
  - `VITE_SUPABASE_ANON_KEY=...`
  - `VITE_SUPABASE_AUTH_PROFILE=development` for local fast iteration, or `production` for real verified-user flows

## 4. Start the app
- Run `npm run dev`.
- Open the account panel in the builder.
- You can either:
  - sign in with an existing Supabase email/password account
  - continue with a GitHub account through Supabase OAuth
  - create a new account directly inside the builder
- Use a real mailbox for sign-up. Placeholder domains such as `example.com`, `.test`, or `localhost` are rejected because they cannot receive verification emails.
- New accounts enter a `pending verification` state until the email link is confirmed.
- After verification, use `I verified` in the account panel or sign in again.
- Once authenticated, Supabase persists the browser session, so the app reconnects automatically on the next startup.

## Auth profiles
- `development`
  - editor guidance assumes local scaffolding speed matters most
  - recommended Supabase setting: temporarily disable `Confirm email`
  - useful when you are still shaping the product skeleton and do not want email delivery to block iteration
- `production`
  - editor guidance assumes real end users, verified email, and per-user isolation
  - keep `Confirm email` enabled
  - recommended: configure Custom SMTP to avoid the built-in email quota bottleneck

## Credentials you need to provide
- Required:
  - Supabase project URL
  - Supabase anon key
- For auth verification:
  - either an existing test account
  - or access to the mailbox of a newly created account

## Important
- Do **not** put the Supabase service role key in the frontend env.
- This integration uses per-user row ownership + RLS, so user/project data stays isolated by Supabase Auth account.
- Pending verification state is cached locally, so the builder can keep showing the verification step even before the first authenticated session exists.
