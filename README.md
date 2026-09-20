# Sanraksha

A React + Vite starter for the Sanraksha hospital management system UI.

## Setup

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Pages / routes

| Route              | Page                              |
|---------------------|------------------------------------|
| `/`                 | Public landing page               |
| `/dashboard`        | Staff dashboard (all patients)    |
| `/portal`           | Patient's own view ("my care")    |
| `/book`             | Book an appointment (patient)     |
| `/book/confirmed`   | Booking confirmation              |
| `/manage`           | Cancel or reschedule appointment  |

## Structure

```
src/
  components/   Logo, Header, SiteFooter, AppFooter — shared across pages
  pages/        One file per route, listed above
  index.css     All shared styling and design tokens (colors, spacing)
  App.jsx       Route definitions
  main.jsx      Entry point
```

## Notes

- All patient/staff data (names, schedules, records) is hardcoded sample data —
  wire it up to a real API/database when you're ready.
- `Header` takes `navLinks`, an optional `user` (for signed-in pages), and an
  optional `cta` (for the public "Sign in" button) — reuse it for any new page.
- Colors and fonts live as CSS variables at the top of `src/index.css`
  (`--maroon`, `--gold`, `--cream`, etc.) — change them there to re-theme
  every page at once.
