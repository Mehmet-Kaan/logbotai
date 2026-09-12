# LogBotAI on Firebase

LogBotAI is deployed as a React single-page application on Firebase Hosting with a
2nd-generation Cloud Function providing the authenticated AI API.

## Architecture

- Firebase Hosting serves the compiled React app from `build/`.
- Requests to `/api/**` are rewritten to the `api` function in `europe-west1`.
- Firebase Authentication provides email/password sign-in.
- Cloud Firestore stores each user's document text and embeddings below
  `users/{uid}/files`.
- Firebase ID tokens protect every paid AI endpoint.
- The OpenAI API key lives in Secret Manager and is available only to the function runtime.

The function scales to zero and is capped at three instances to limit idle and
runaway cost. Hosting has a 60-second serverless rewrite timeout, so uploads are
limited to 10 files, 20 MB of local file data, and 120,000 extracted characters
per file.

## One-time Firebase setup

1. Create the Firebase project and register a Web app.
2. Upgrade the project to the Blaze plan; deploying Cloud Functions requires it.
3. Enable **Authentication > Sign-in method > Email/Password**.
4. Create a Cloud Firestore database in `europe-north2` (Stockholm).
5. Install dependencies:

   ```bash
   npm install
   npm --prefix functions install
   ```

6. Copy `.env.example` to `.env.local` and paste the Web app configuration shown
   by Firebase Project settings.
7. Select the new project from this directory:

   ```bash
   firebase login
   firebase use --add
   ```

8. Store the backend provider credential:

   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   ```

Set a Google Cloud budget and budget alerts before making the site public.

## Local development

Copy `functions/.secret.local.example` to `functions/.secret.local`, insert local
development values, and set `REACT_APP_USE_FIREBASE_EMULATORS=true` in
`.env.local` when you also want local Auth and Firestore. The Firestore emulator
requires a local Java runtime.

Run the Firebase emulators and React dev server in separate terminals:

```bash
npm run firebase:emulators
npm start
```

The React development proxy sends `/api` requests through the Hosting emulator at
`127.0.0.1:5500`, matching production routing.

## Verify and deploy

```bash
npm --prefix functions test
npm run build
firebase deploy --only functions,hosting,firestore
```

After deployment, add the Firebase Hosting domain to Authentication's authorized
domains if Firebase has not added it automatically.

## Legacy frontend toolchain

The direct browser dependencies have been updated, including Firebase, Axios,
Mammoth, React Router, and PDF.js. Create React App itself is no longer maintained,
so its build/test dependency tree still produces npm audit advisories. A later
migration to Vite is recommended; it is independent of the Firebase deployment.

## Security note

The legacy backend workspace contains an old GCP service-account JSON file and
local API keys. The Firebase function does not use that file: Firebase Admin uses
the function's runtime identity. Revoke the old service-account key in Google
Cloud IAM, rotate any exposed third-party keys, and remove credential files from
source history before publishing either repository.
