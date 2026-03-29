# 💊 MoodCapsule Frontend — Angular

A professional, production-grade Angular frontend for the MoodCapsule Spring Boot backend.

---

## ✨ Design System

**Aesthetic: Dark Luxury — Midnight Ink with Champagne Gold**

- **Fonts**: Playfair Display (headings) + DM Sans (body) + DM Mono (data)
- **Color Palette**: Midnight base (#0a0b0f) · Champagne gold accents · Teal secondary
- **Motion**: Staggered fade-in animations, floating emoji, smooth transitions
- **Layout**: Collapsible sidebar (260px) + responsive main area

---

## 📦 Pages & Features

| Page            | Route                | Description                              |
|-----------------|----------------------|------------------------------------------|
| Login           | `/auth/login`        | Split panel with feature highlights      |
| Register        | `/auth/register`     | Multi-step with password strength        |
| Forgot Password | `/auth/forgot-password` | Email reset flow                      |
| Verify Email    | `/verify-email`      | 6-digit code entry                       |
| Reset Password  | `/reset-password`    | Token-based password reset               |
| **Dashboard**   | `/dashboard`         | Stats cards, today's mood, recent history |
| Log Mood        | `/mood/log`          | Full-page emoji selector + journal       |
| History         | `/mood/history`      | Filtered, paginated mood entries         |
| Statistics      | `/stats/overview`    | SVG trend chart + mood distribution      |
| Year Recap      | `/stats/recap`       | Full yearly emotional summary            |
| Profile         | `/profile`           | Edit profile, theme, reminders           |
| Admin Panel     | `/admin`             | User management (ADMIN role only)        |

---

## 🚀 Setup & Run

### Prerequisites
- Node.js 20+
- Angular CLI 21: `npm install -g @angular/cli@21`
- MoodCapsule backend running on `http://localhost:8080`

### Install & Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
ng serve

# 3. Open browser
http://localhost:4200
```

### Build for Production
```bash
ng build --configuration production
```

---

## 🔗 Backend API

The frontend points to `http://localhost:8080/api`.

To change the base URL, edit:
```
src/app/core/services/auth.service.ts
export const API_BASE = 'http://localhost:8080/api';
```

CORS is already configured in the Spring Boot backend to allow all origins.

---

## 📁 Project Structure

```
src/app/
├── core/
│   ├── guards/           # authGuard, adminGuard, guestGuard
│   ├── interceptors/     # JWT token interceptor + auto-refresh
│   ├── models/           # All TypeScript interfaces matching backend DTOs
│   └── services/         # AuthService, MoodService, StatsService, UserService, AdminService, ToastService
├── shared/
│   └── components/
│       ├── layout/       # Sidebar + topbar shell
│       └── toast-container/
├── features/
│   ├── auth/             # login, register, forgot-password, verify-email, reset-password
│   ├── dashboard/        # Main dashboard
│   ├── mood/             # log-mood, history
│   ├── stats/            # overview (trend chart), recap (yearly)
│   ├── profile/          # user settings
│   └── admin/            # admin panel
└── styles.scss           # Complete design system (CSS variables, components, utilities)
```

---

## 🎨 Key Design Decisions

- **Standalone Components** — Angular 17 modern pattern, no NgModules
- **Signals** — Reactive state management using Angular signals
- **Lazy Loading** — Every feature module is lazy-loaded for performance
- **CSS Variables** — Full design token system, easy theming
- **SVG Charts** — Hand-crafted SVG trend chart (no external chart library needed)
- **Auth Guard + JWT Interceptor** — Auto-refresh on 401, auto-logout on refresh failure

---

## 👥 Team: Capsule Labs
- UJ · Aaditya Subedi · Aryan Puchimada · Lovepreet Toor

---

*Sheridan College — Software Development & Network Engineering — Capstone Project*
