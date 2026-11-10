# MoodCapsule – Web (Angular)

The web app is MoodCapsule's **reflection desk**. Moments are logged on the phone (Android app); the web is for
looking back: your days, your patterns and your time capsules, on a big screen. It uses the same account and
REST API as Android and the same "Dreamy Gradient" design (light + dark).

## Pages

| Page | What it does |
|---|---|
| Sign in / Create account / Verify email / Forgot + Reset password | Email + password, or **Continue with Google** (MC-69) |
| Overview | This week at a glance, today's moments (read-only), On this day, capsules, 15-week heatmap, happiest places |
| Year in Pixels | One square per day coloured by mood; click a day to read it; month-by-month averages |
| Journal | Every moment grouped by day with reflections; search, place, mood and date filters |
| Insights | Mood over time, by place, by time of day, by weekday, mood mix, year so far |
| Time Capsules (MC-67) | Countdowns, opening animation, re-read opened ones, seal a new letter to future you |
| Weekly review | The week's days, best/toughest day, happiest place, reflections, a short summary |
| Capsule Wrapped | Monthly or yearly recap card – download as PNG or share |
| Profile & data | Avatar, name, bio, theme, time zone, places, export CSV, privacy, delete account |
| Admin | Search accounts, deactivate / reactivate (admins never see anyone's moments) |

## Run it

```bash
npm install          # first time only
npm start            # = ng serve → http://localhost:4200
npm run build        # production build → dist/moodcapsule-frontend/browser
```

The backend address and the Google **web** client ID are in `src/environments/environment.ts`
(the Azure server by default – it allows `http://localhost:4200`). Every address that serves the web app
must be added to:
- the backend's `CORS_ALLOWED_ORIGINS` (Azure → Environment variables), and
- "Authorized JavaScript origins" of the Web OAuth client in Google Cloud (for the Google button).

## Structure

```
src/app/
  core/        models, ApiService (all endpoints), AuthService, ProfileStore, ThemeService, ToastService,
               JWT interceptor (refreshes once on 401), guards, utils (dates in the user's time zone, mood colours)
  shared/      layout (sidebar), toast container, Google button, 6-digit code input, moment card,
               day panel, mood heatmap, mood line chart
  features/    auth, overview, pixels, journal, insights, capsules, weekly, wrapped, profile, admin
src/styles.scss  design tokens (same names/colours as the Android app) + shared components
src/assets/      Poppins font files, MoodCapsule logo
```

`node_modules`, `dist` and `.angular` are build output – they're in `.gitignore` and must never be committed.
