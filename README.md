# StitchUp

Modern Firebase app for finding nearby tailors, booking stitching/alterations, and tracking orders.

## How to run

Option A – from root (recommended):

```bash
# install Frontend deps
npm run install:frontend

# start dev server
npm run dev
```

Option B – from Frontend folder:

```bash
cd Frontend
npm install
npm run dev
```

The app runs on http://localhost:5173 by default.

## Structure

- Frontend/ – Vite React app (UI)
- dataconnect/ - Firebase Data Connect (Database)
- package.json (root) – proxies scripts to Frontend to avoid npm ENOENT at root
- .gitignore – unified ignores
- firebase.json - Firebase configuration

## Notes

- Set environment variables in `Frontend/.env.local` (create from `sdkconfig.json` if needed).
- Use `npm run build` (root) to build Frontend.

