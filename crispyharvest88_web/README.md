# Crispy Harvest Web App

React + Vite web app for Crispy Harvest cookie ordering, with a small Express backend for password reset emails.

## Project structure

```text
crispyharvest_web/
├─ src/                     # React app source
├─ public/img/              # Product and logo images
├─ crispyharvest_backend/   # Express backend
├─ package.json             # Frontend dependencies/scripts
└─ README.md
```

## Important security note

This repository intentionally does **not** include:

- `node_modules/`
- `.env`
- `crispyharvest_backend/serviceAccountKey.json`

Keep those private. Do not push secrets to GitHub.

## Frontend setup

```bash
npm install
npm run dev
```

Open the localhost link shown in the terminal.

## Backend setup

```bash
cd crispyharvest_backend
npm install
cp .env.example .env
npm start
```

Then fill in `.env` with your Gmail app password and Firebase credentials.

For local development, place your Firebase service account at:

```text
crispyharvest_backend/serviceAccountKey.json
```

For deployment, use the environment variable:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

## Build frontend

```bash
npm run build
```

## Firebase setup

Enable these in Firebase Console:

- Authentication → Sign-in method → Email/Password
- Authentication → Sign-in method → Google
- Firestore Database

## Firestore testing rules

Use only for testing. Tighten rules before production.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```
