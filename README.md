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
| `/admin-dashboard`  | Admin dashboard overview          |
| `/complete-profile` | Complete or update patient details |
| `/portal`           | Patient's own view ("my care")    |
| `/book`             | Book an appointment (patient)     |
| `/book/confirmed`   | Booking confirmation              |
| `/manage`            | Cancel or reschedule appointment  |

Admin workspace sections are available from the dashboard navigation: Patients,
Appointments, Staff, and Billing. Patients and Staff use protected admin APIs;
Billing creates INR invoices and uses Razorpay Checkout in test mode.
Patient Billing shows invoices assigned to the signed-in patient and supports
paying pending invoices when Razorpay test checkout is configured.

Patients with incomplete profile details are directed to `/complete-profile`
after signing in. Patients can also open the same page from the profile avatar
in the header to update their name, phone, gender, date of birth, blood group,
and address.

## Structure

```
src/
  components/   Logo, Header, SiteFooter, AppFooter — shared across pages
  pages/        One file per route, listed above
  index.css     All shared styling and design tokens (colors, spacing)
  App.jsx       Route definitions
  main.jsx      Entry point
```

## Backend and Razorpay test mode

Run the Spring Boot backend from the `backend` directory. Invoice creation and invoice
history work without gateway credentials. To enable Razorpay test checkout,
set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the backend process
environment using test-mode credentials from the Razorpay dashboard. Keep the
secret on the backend; only the public key ID is returned to the browser.
Do not use live credentials until the payment flow has been tested and reviewed.
Razorpay test transactions do not move real funds; live transactions have
gateway fees and require a separate production configuration.

## Notes

- `Header` takes `navLinks`, an optional `user` (for signed-in pages), and an
  optional `cta` (for the public "Sign in" button) — reuse it for any new page.
- Colors and fonts live as CSS variables at the top of `src/index.css`
  (`--maroon`, `--gold`, `--cream`, etc.) — change them there to re-theme
  every page at once.
