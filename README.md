# QSpiders Asset Portal

React (Vite) frontend with an Express API and PostgreSQL.

## Development

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, Supabase keys, etc.
2. `npm install` then `npm run dev`

| Service | URL |
|--------|-----|
| **App (Vite)** | http://localhost:5353 |
| **API (Express)** | http://localhost:5355 (`PORT` in `.env`, default 5355) |

`npm run dev` starts both. The Vite dev server proxies `/api` to the API. CORS allows the app origin `http://localhost:5353`.

- `npm run dev:client` — Vite only  
- `npm run dev:server` — API only  
- `npm run preview` — production build preview on **5353** (start API on **5355** separately for `/api`)

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
