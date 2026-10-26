# Chivapp — Design System

Referencia de diseño regenerada directamente desde `tailwind.config.ts`, `src/app/globals.css`, `src/lib/ui-classes.ts` y verificada automáticamente por `src/lib/contrast-tokens.test.ts` (WCAG 2.2 AA).

## Marca e idioma

| Campo | Valor |
|-------|-------|
| Nombre | **Chivapp** |
| Copy de UI | Español (`es-PE`) — **Sentence case** (solo mayúscula inicial y nombres propios; evitar Title Case anglosajón) |
| Código (variables, funciones, archivos) | Inglés |

### Glosario de producto (consistencia léxica)

- **Cotización (`requested` / `accepted` / `contract_pending` / `contract_signed` / `payment_pending`)**: etapa previa al pago confirmado. Acción del cliente: **Pedir cotización**.
- **Reserva (`payment_retained` / `change_pending` / `in_progress` / `payment_released` / `completed` / `cancelled`)**: contratación con fecha, monto y contrato gestionados en plataforma.
- **En revisión**: acompañar siempre del objeto (*"Perfil en revisión"*, *"Pago en revisión"*, *"Solicitud de retiro en revisión"*).
- **Mis cobros** (`/musician/earnings`): ingresos que el músico recibe por sus eventos.
- **Reparto a integrantes** (`/musician/payouts`): distribución de pagos del líder a sus integrantes.
- **Mis pagos y gastos** (`/contractor/operations`): centro financiero del contratista.

## Fuente de verdad

Los tokens viven en `tailwind.config.ts` (plugin HeroUI) y `src/app/globals.css`. **No** duplicar colores en CSS ni usar valores hex o paletas crudas (`slate-*`, `zinc-*`, etc.) en páginas de producto.

- Componentes interactivos → HeroUI directo (`Button`, `Input`, `Card`, `Tabs`, `Select`, `Modal`, etc.)
- Clases reutilizables de superficie, cabeceras e inputs → `src/lib/ui-classes.ts` (`UI.*`)
- Etiquetas y ayudas de estado de reserva por rol → `src/lib/booking-labels.ts`
- Guarda automática de contraste en CI → `src/lib/contrast-tokens.test.ts` y reglas ESLint en `eslint.config.mjs`

## Colores y contraste (WCAG 2.2 AA)

Paleta refinada (v2): celeste/teal con tokens semánticos de texto para garantizar contraste ≥ 4.5:1 en texto normal (incluso sobre superficies `content3` o tintes suaves `/20`) y ≥ 3.0:1 en bordes de campos y anillos de foco (WCAG 1.4.11).

| Token | Hex (Light / Dark) | Ratio vs `background` (vs `content1` / `content3`) | Uso | Clases |
|-------|-----|-----|-----|--------|
| `primary` | `#46C0D9` / `#46C0D9` | **8.30:1** con `#101826` (L) / **8.97:1** con `#0B0F14` (D) | Superficies de CTA, acentos gráficos, bordes activos | `bg-primary`, `border-primary/40` |
| `primary-foreground` | `#101826` / `#0B0F14` | **8.30:1** (L) / **8.97:1** (D) sobre `#46C0D9` | Texto e iconos sobre `bg-primary` | `text-primary-foreground` |
| `primary-text` | `#1D6478` / `#6FD3E6` | **6.21:1** (`6.67:1` s/blanco, `5.76:1` s/`content3`) / **11.11:1** (`10.11:1` s/`content1`, `8.26:1` s/`content3` D) | Texto de acento, enlaces, precios destacados | `text-primary-text` (o `.text-primary`) |
| `secondary-text` | `#2E4F55` / `#9CC4C7` | **8.15:1** (`8.76:1` s/blanco, `7.57:1` s/`content3`) / **10.02:1** (`9.12:1` s/`content1`, `7.45:1` s/`content3` D) | Texto secundario con matiz de marca | `text-secondary-text` (o `.text-secondary`) |
| `success-text` | `#166534` / `#4ADE80` | **6.62:1** (`7.13:1` s/blanco, `6.16:1` s/`content3`) / **11.03:1** (`10.04:1` s/`content1`, `8.20:1` s/`content3` D) | Texto e indicadores de éxito o verificación | `text-success-text` |
| `warning-text` | `#92400E` / `#FBBF24` | **6.50:1** (`7.00:1` s/blanco, `6.05:1` s/`content3`) / **11.49:1** (`10.46:1` s/`content1`, `8.54:1` s/`content3` D) | Texto de advertencia o pendiente | `text-warning-text` |
| `danger-text` | `#991B1B` / `#FCA5A5` | **7.32:1** (`7.88:1` s/blanco, `6.81:1` s/`content3`) / **9.91:1** (`9.02:1` s/`content1`, `7.37:1` s/`content3` D) | Texto de error o alerta destructiva (incluye chips `flat` sobre `/20`) | `text-danger-text` |
| `danger` | `#DC2626` / `#F87171` | **4.83:1** con `#FFFFFF` (L) / **7.79:1** con `#0B0F14` (D) | Botones y badges destructivos sólidos | `bg-danger text-danger-foreground` |
| `secondary` | `#3A6169` / `#3A6169` | **6.79:1** con `#FFFFFF` | Acento complementario (teal, escala 50–900 disponible) | `bg-secondary text-secondary-foreground` |
| `focus` | `#1D6478` / `#46C0D9` | **6.21:1** s/`background`, **6.67:1** s/`content1` (L) / **8.97:1** s/`background`, **8.16:1** s/`content1` (D) | Anillo de foco accesible (`outline-focus` y `:focus-visible`) | `focus-visible:outline-focus` |
| `background` | `#F5F7F8` / `#0B0F14` | — | Fondo de página | `bg-background` |
| `foreground` | `#101826` / `#F5F7F8` | **16.48:1** (L) / **17.40:1** (D) | Texto principal (escala completa `foreground-50` a `foreground-900` definida en `tailwind.config.ts`) | `text-foreground` |
| `foreground-500` | `#52525B` / `#B4B4BE` | **7.08:1** s/blanco (L) / **8.79:1** s/`content1` (D) | Placeholders de HeroUI (`placeholder:text-foreground-500`) | `text-foreground-500` |
| `content1` | `#FFFFFF` / `#141A22` | — | Cards, navbar, superficies primarias | `bg-content1` |
| `content2` | `#F5F7F8` / `#1A222C` | — | Superficies secundarias | `bg-content2` |
| `content3` | `#EBEDEF` / `#222B36` | — | Superficies terciarias, cabeceras de tabla | `bg-content3` |
| `content4` | `#E2E5E8` / `#2B3542` | — | Superficies de cuarto nivel | `bg-content4` |
| `default-200` | `#E4E4E7` / `#2A3340` | — | Bordes decorativos de contenedor (`border-default-200/70`) | `border-default-200` |
| `default-300` | `#71717A` / `#6B7280` | **4.43:1** s/`background` (`4.77:1` s/blanco) / **3.75:1** s/`content1` (D) | Bordes visibles secundarios | `border-default-300` |
| `default-400` | `#63636B` / `#9A9AA5` | **5.45:1** s/`background` (`5.86:1` s/blanco) / **6.28:1** s/`content1` (D) | Bordes de campos interactivos (`border-default-400` ≥ 3.0:1 en claro y oscuro) y metadatos terciarios | `border-default-400`, `text-default-400` |
| `default-500` | `#52525B` / `#B4B4BE` | **6.59:1** s/`background` (`7.08:1` s/blanco) / **8.79:1** s/`content1` (D) | Texto secundario / muted y placeholders | `text-default-500` |
| `default-600` | `#3F3F46` / `#C4C4CC` | **9.66:1** s/`background` (`10.39:1` s/blanco) / **10.50:1** s/`content1` (D) | Subtítulos y etiquetas de soporte | `text-default-600` |
| `default-700` | `#27272A` / `#D4D4D8` | **13.78:1** s/`background` (`14.82:1` s/blanco) / **12.23:1** s/`content1` (D) | Texto de alto énfasis secundario | `text-default-700` |
| `default-900` | `#0F1213` / `#0A0D10` | — | Secciones oscuras | `bg-default-900` |

### Override global para variantes `flat` de HeroUI (`src/app/globals.css:23-52`)

HeroUI aplica clases como `.text-primary`, `.text-danger` o `.text-warning-600` en `Chip`/`Button`/`Alert` con `variant="flat"`. En `src/app/globals.css` se redirigen automáticamente a las variables `--color-*-text` cuando el elemento no tiene fondo sólido (`:not(.bg-primary)`, `:not(.bg-danger)`, etc.), garantizando contraste ≥ 4.5:1 incluso sobre tintes translúcidos (`bg-primary/20`, `bg-danger/20`) en claro y oscuro.

### Degradados y sombras (`tailwind.config.ts:30-43`)

| Token | Clase | Uso |
|-------|-------|-----|
| `bg-gradient-brand` | `linear-gradient(135deg, #6FD3E6 0%, #46C0D9 45%, #3A6169 100%)` | Botones/CTAs destacados, badges premium |
| `bg-gradient-radial-brand` | `radial-gradient(120% 120% at 20% 0%, rgba(70,192,217,0.22) 0%, rgba(70,192,217,0) 55%)` | Halo detrás del hero, secciones destacadas |
| `bg-gradient-surface` | `linear-gradient(160deg, rgba(255,255,255,0.9) 0%, rgba(245,247,248,0.6) 100%)` | Cards con relieve suave sin imagen |
| `shadow-soft` | `0 2px 12px -4px rgb(16 24 32 / 0.06)` | Cards en reposo |
| `shadow-elevated` | `0 16px 40px -12px rgb(16 24 32 / 0.16)` | Cards en hover / barras flotantes |
| `shadow-glow` / `shadow-glow-lg` | `0 8px 30px -6px rgb(70 192 217 / 0.45)` | CTAs primarios |

### Reglas de color (verificadas por ESLint `no-restricted-syntax`)

- ❌ Prohibido usar `dark:text-primary-N`, `dark:text-danger-N`, `dark:text-warning-N`, `dark:text-success-N` o `dark:text-secondary-N` (bloqueado por `eslint.config.mjs`). Usar siempre `text-primary-text`, `text-danger-text`, `text-warning-text`, `text-success-text`, `text-secondary-text`.
- ❌ **Sobre `bg-primary` usar siempre `text-primary-foreground`; nunca `text-white`** (`#FFFFFF` sobre `#46C0D9` solo da 2.14:1).
- ❌ Prohibido usar `outline-none` o `focus:outline-none` sin reemplazo `:focus-visible` (bloqueado por `eslint.config.mjs`).
- ✅ Para bordes de campos de texto, usar `border-default-400` (o `UI.input`) para cumplir ≥ 3.0:1 frente a `bg-background` y `bg-content1`.
- ✅ El visor/editor de contratos usa `.contract-doc-page` (`background-color: #ffffff; color: #18181b` en `globals.css:216-323`) para preservar legibilidad tanto en hoja blanca como en contenedores oscuros.

## Tipografía

**Familia tipográfica**: **Geist Sans** (`font-sans`, `--font-geist-sans`) y **Geist Mono** (`font-mono`, `--font-geist-mono`).

| Nivel | Clases | Uso |
|-------|--------|-----|
| Hero / H1 (`UI.pageTitle`) | `text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight` | Títulos principales de página |
| Sección / H2 (`UI.sectionTitle`) | `text-xl font-bold text-foreground` | Títulos de sección |
| Subtítulo página (`UI.pageSubtitle`) | `text-default-500 mt-2 text-sm sm:text-base` | Subtítulo bajo `pageTitle` |
| Subtítulo sección (`UI.sectionSubtitle`) | `text-sm text-default-500 mt-1` | Subtítulo bajo `sectionTitle` |
| Body | `text-base` (16 px) | Párrafos e **inputs en móvil** (evita auto-zoom en iOS) |
| Body compact | `text-sm` (14 px) | Contenido de decisión, tablas, descripciones secundarias |
| Metadatos / Badges | `text-xs` (12 px) | **Tamaño mínimo absoluto**, solo para metadatos o chips |
| Números / cifras | `font-bold tabular-nums leading-none` | Contadores, pasos, precios |

## Accesibilidad (Requisitos obligatorios)

1. **Un único `<main>` por página**: definido en `src/app/layout.tsx` con `id="contenido"` y enlazado desde `"Saltar al contenido"`.
2. **Touch targets ≥ 44 × 44 px**: los controles primarios, botones solo-icono, cierres de modal (`globals.css:392-418`) y navegación móvil usan `.touch-target` (`min-width: 2.75rem; min-height: 2.75rem`) o `min-h-11 min-w-11`. `size="sm"` se reserva únicamente para tablas densas de escritorio o acciones secundarias compactas.
3. **Foco visible (`:focus-visible` y `focus` de HeroUI)**: definido en `@layer base` (`globals.css:55-63`) con `#1D6478` en claro y `#46C0D9` en oscuro.
4. **Sin textos rotatorios automáticos sin control (WCAG 2.2.2 Nivel A)**: el subtítulo del hero (`src/components/home/hero-search-section.tsx`) y el título del modal de autenticación (`src/components/auth/auth-modal.tsx`) son estáticos (sin `setInterval`), verificado en `src/lib/contrast-tokens.test.ts`. Además, `MotionConfig reducedMotion="user"` está activo en `src/app/providers.tsx` y `@media (prefers-reduced-motion: reduce)` neutraliza animaciones en `globals.css:72-84`.
5. **Reglas `jsx-a11y` activas en ESLint (`eslint.config.mjs`)**: `alt-text`, `aria-props`, `aria-proptypes`, `aria-unsupported-elements`, `role-has-required-aria-props` y `role-supports-aria-props` en nivel `error`. Todo `Input` o `Tabs` sin etiqueta visible lleva `aria-label`.
6. **Confirmación de acciones destructivas**: usar `ConfirmDialog` (`src/components/ui/confirm-dialog.tsx`) en lugar de `window.confirm()`.

## Variables CSS de layout y comportamiento móvil

| Variable / Clase | Definición | Responsabilidad |
|------------------|------------|-----------------|
| `--app-navbar-height` | `5rem` (`globals.css:5`) | Offset vertical para layouts de paneles (`role-dashboard-shell.tsx`, `admin-layout-client.tsx`) y sidebars sticky. La barra pública (`src/components/layout/navbar.tsx`) se mantiene fija en `h-16` sin expansión por scroll |
| `--bottom-nav-h` | `4.25rem` en móvil con barra inferior / `0px` en escritorio (`role-dashboard-shell.tsx:218`) | Desplaza barras sticky de wizards y CTAs flotantes por encima de la navegación inferior móvil |
| `--cookie-h` | Medido con `ResizeObserver` en `cookie-consent-banner.tsx:37` | Desplaza la barra móvil de cotización (`musician-detail-view.tsx`), el timeline (`booking-timeline.tsx`) y el widget de ayuda (`help-widget.tsx`) cuando el banner de cookies está visible; se limpia al aceptar/cerrar |
| `.hide-on-keyboard` | `@media (max-width: 768px) and (max-height: 450px)` con `body:has(input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus)` (`globals.css:469-473`) | Oculta barras fijas inferiores en pantallas bajas **solo cuando un campo editable tiene el foco**, evitando que el CTA desaparezca al girar el teléfono en horizontal (`UX6-04`) |

## Constantes compartidas (`src/lib/ui-classes.ts`)

| Constante | Clases | Uso |
|-----------|--------|-----|
| `UI.surfaceCard` | `rounded-4xl border border-default-200/70 bg-content1 shadow-soft` | Contenedor estándar de tarjeta |
| `UI.surfaceCardHover` | `hover:shadow-elevated hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300` | Modificador hover para tarjetas |
| `UI.surfaceCardInteractive` | `rounded-4xl border border-default-200/70 bg-content1 shadow-soft hover:shadow-elevated hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300` | Tarjeta interactiva clicable |
| `UI.pageHero` | `rounded-4xl border border-default-200/70 bg-gradient-to-br from-primary/15 via-content1 to-content1 px-4 py-5 sm:px-6 sm:py-6 shadow-soft overflow-hidden relative` | Cabecera destacada de página en paneles |
| `UI.pageTitle` | `text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight` | Título principal de vista |
| `UI.pageSubtitle` | `text-default-500 mt-2 text-sm sm:text-base` | Subtítulo de vista |
| `UI.sectionTitle` | `text-xl font-bold text-foreground` | Título de sección |
| `UI.sectionSubtitle` | `text-sm text-default-500 mt-1` | Subtítulo de sección |
| `UI.heroCard` | `rounded-4xl border border-default-200/70 shadow-soft` | Card de bloque hero |
| `UI.statCard` | `border border-default-200/70 shadow-soft` | Tarjeta de métrica/KPI |
| `UI.listRow` | `rounded-4xl border border-default-200/70 bg-content1 shadow-soft hover:shadow-elevated hover:border-primary/30 transition-all duration-300` | Fila de listado en tarjeta |
| `UI.stickyBar` | `sticky bottom-4 z-10 rounded-4xl border border-default-200/70 bg-content1/90 backdrop-blur-xl p-3 sm:p-4 shadow-elevated flex flex-wrap items-center justify-between gap-3` | Barra inferior pegajosa de acciones |
| `UI.tablePanel` | `rounded-3xl border border-default-200/70 bg-content1 shadow-soft overflow-x-auto` | Contenedor de tabla ancha con scroll horizontal |
| `UI.primaryButton` | `font-semibold shadow-glow hover:shadow-glow-lg transition-shadow` | CTA primario con resplandor |
| `UI.skeleton` | `rounded-4xl bg-content1 border border-default-200/70 animate-pulse` | Placeholder de carga |
| `UI.input` | `{ inputWrapper: "border-default-400 data-[hover=true]:border-default-500", input: "placeholder:text-default-500" }` | `classNames` para `Input`/`Select` con borde ≥ 3:1 y placeholder ≥ 4.5:1 |
| `UI.authInput` | `{ input: "placeholder:text-default-600" }` | `classNames` para inputs en modales/formularios de autenticación |

## Archivos clave

| Archivo | Responsabilidad |
|---------|-----------------|
| `tailwind.config.ts` | Tokens de color, escala `foreground-50…900`, `default-50…900`, radius y sombras |
| `src/app/globals.css` | Variables `--color-*-text`, overrides `flat`, `:focus-visible`, `.touch-target`, `.contract-doc-page`, `.hide-on-keyboard`, `prefers-reduced-motion` |
| `src/lib/ui-classes.ts` | Constantes `UI.*` compartidas entre vistas públicas y paneles |
| `src/lib/contrast-tokens.test.ts` | Test unitario Vitest que verifica ratios WCAG AA (≥ 4.5:1 texto, ≥ 3.0:1 bordes/foco) y guardas estáticas |
| `src/lib/booking-labels.ts` | Etiquetas de estado (`BOOKING_STATUS_LABELS`), etiquetas por rol (`getBookingStatusLabel`) y microcopy (`getBookingStatusHint`) |
| `src/components/ui/confirm-dialog.tsx` | Modal accesible reutilizable para confirmar acciones destructivas |
| `src/app/layout.tsx` | Fuente Geist, skip-link `#contenido`, `<main id="contenido">`, metadata, `lang="es"` |
| `src/app/providers.tsx` | `HeroUIProvider` (`locale="es-PE"`), `MotionConfig` (`reducedMotion="user"`) |
