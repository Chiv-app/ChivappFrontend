# Frontend — Chivapp Web App

Aplicación web **Next.js 16** (App Router) para descubrir y contratar músicos. Marca: **Chivapp**. UI en español (Sentence case); código en inglés.

## Stack

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Next.js | 16.4 | Framework, SSR, App Router |
| React | 19.2 | UI |
| HeroUI | 2.8 | Componentes (`Button`, `Input`, `Card`, `Modal`, `Tabs`, `Table`, …) |
| Tailwind CSS | 4 | Estilos y tokens |
| TypeScript | 5 | Tipado |
| @iconify/react | 6 | Iconos |
| Vitest + React Testing Library | — | Tests unitarios y de componentes |

## Estructura

```
src/
├── proxy.ts                    # Proxy/middleware de Next 16 (rutas privadas y redirecciones de sesión)
├── types/
│   ├── api/                    # Espejo de schemas Pydantic (*Out, *Create)
│   └── ui/
│       └── musician.ts         # MusicianCard, MusicianDetail (vista)
├── app/
│   ├── layout.tsx              # Root: fuentes Geist, skip-link (#contenido), Providers
│   ├── loading.tsx             # Estado de carga global (App Router)
│   ├── error.tsx               # Boundary de error global con reintento
│   ├── providers.tsx           # NextThemesProvider > HeroUIProvider (es-PE) > MotionConfig > AuthProvider
│   ├── globals.css             # Tokens semánticos, focus-visible, touch-target, reduced-motion
│   ├── sitemap.ts              # SEO — usa slug del músico cuando existe, fallback a id
│   ├── (public)/               # Home (ISR), /musicians, /musicos/[genero]/[ciudad], /musicians/[id], /share/[token]
│   ├── pay/[token]/            # Checkout de link de pago rápido
│   ├── (auth)/                 # login, register, forgot/reset-password, verify-email, complete-role
│   ├── (musician)/musician/*   # Dashboard de músico: bookings, links, earnings, payouts, members, profile, reports
│   ├── (contractor)/contractor/* # Dashboard de contratista: bookings, operations, profile, notifications
│   ├── (admin)/admin/*         # Dashboard de administración
│   ├── invite/member/[token]   # Invitación de integrante de ensamble
│   └── api/                    # geocode, proxy a /api/v1
├── components/
│   ├── home/                   # home-view, hero-search-section, home-intro-section, process-view
│   ├── layout/                 # app-navbar, theme-toggle, musician-card
│   ├── auth/                   # login-form, register-form, auth-modal, book-action-button, social-auth-buttons
│   ├── booking/                # booking-request-form, booking-confirmed-workspace, booking-mercadopago-modal
│   ├── dashboard/              # role-dashboard-shell (sidebar + bottom-nav), vistas de paneles
│   ├── musician/               # musician-detail-view, musician-profile-wizard, musician-onboarding
│   └── ui/                     # confirm-dialog, signature-pad, masonry-item, hero-card-wrapper
├── contexts/                   # auth-context, notifications-context, auth-modal-context
├── hooks/                      # use-is-client, ...
└── lib/
    ├── api.ts                  # apiFetch<T>() genérico
    ├── auth.ts                 # login/registerUser, getCurrentUser(): UserOut | null
    ├── booking-labels.ts       # Etiquetas y ayudas de estado de reserva sensibles al rol
    ├── dashboard-nav.ts        # Navegación de paneles por rol
    ├── ui-classes.ts           # Clases compartidas UI.card, UI.input, UI.select, UI.modal, UI.skeleton
    ├── musicians.ts            # getMusicians(), getMusicianById(), searchMusicians()
    └── mappers/                # Transformación API → UI
```

## Variables de entorno

Copiar `.env.example` a `.env.local`:

| Variable | Descripción | Valor local |
|----------|-------------|-------------|
| `NEXT_PUBLIC_API_URL` | Base URL del backend | `/api/v1` (proxy mismo origen) o `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_UPLOADS_URL` | Host público opcional de uploads | (vacío en local; usa `/uploads`) |

## Arranque local

```bash
cd Frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # Build producción
npm run start    # Servir build
npm run lint     # ESLint
npm run test     # Vitest (unitarios + componentes)
```

## Design system y accesibilidad

Ver **[DESIGN.md](./DESIGN.md)** (única fuente de verdad documental) para:

- Paleta de colores y tokens de contraste WCAG 2.2 AA (`primary`, `primary-foreground`, `primary-text`, `success-text`, `warning-text`, `danger-text`, `default-400..600`).
- Escala tipográfica en Geist Sans (mínimo 12 px para metadatos, 14 px contenido, 16 px en inputs móviles).
- Reglas de accesibilidad (`:focus-visible`, touch targets de 44×44 px, `prefers-reduced-motion`, `ConfirmDialog`, glosario cotización/reserva y Sentence case).
- Guía de uso de componentes HeroUI y utilidades `src/lib/ui-classes.ts` (`UI.*`) y `src/lib/booking-labels.ts`.

## Testing

Suite de **Vitest + React Testing Library** en `src/`, junto a los archivos que testean:

```bash
npm run test        # unitarios + componentes (excluye smoke)
npm run test:watch  # modo watch
npm run test:smoke  # smoke tests, requiere SMOKE_BASE_URL
```

## Convenciones

| Ámbito | Idioma |
|--------|--------|
| Texto visible al usuario | Español (Sentence case) |
| Código (archivos, variables, funciones) | Inglés |
| Commits y docs técnicos | Español o inglés (consistente por archivo) |
