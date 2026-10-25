# Chivapp — Design System

Referencia de diseño para mantener consistencia visual y accesibilidad WCAG 2.2 AA en todas las vistas.

## Marca e idioma

| Campo | Valor |
|-------|-------|
| Nombre | **Chivapp** |
| Copy de UI | Español — **Sentence case** (solo mayúscula inicial y nombres propios; evitar Title Case anglosajón como *"Confirmar y Proceder al Pago"*) |
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

- Componentes interactivos → HeroUI directo (`Button`, `Input`, `Card`, etc.)
- Clases reutilizables de superficie, inputs y cabeceras → `src/lib/ui-classes.ts` (`UI.*`)
- Etiquetas y ayudas de estado de reserva por rol → `src/lib/booking-labels.ts`

## Colores y contraste (WCAG 2.2 AA)

Paleta refinada (v2): celeste/teal con tokens semánticos de texto para garantizar contraste ≥ 4.5:1 en texto normal y ≥ 3:1 en componentes UI.

| Token | Hex (Light / Dark) | Ratio vs `background` (vs `content1`) | Uso | Clases |
|-------|-----|-----|-----|--------|
| `primary` | `#46C0D9` | 8.30:1 con `#101826` | Superficies de CTA, acentos gráficos, bordes activos | `bg-primary`, `border-primary/40` |
| `primary-foreground` | `#101826` / `#0B0F14` | **8.30:1** (L) / **8.97:1** (D) sobre `#46C0D9` | Texto e iconos sobre `bg-primary` | `text-primary-foreground` |
| `primary-text` | `#1D6478` / `#6FD3E6` | **6.21:1** (`6.67:1` s/blanco) / **11.11:1** (`10.11:1` s/`content1` D) | Texto de acento, enlaces, precios destacados | `text-primary-text` (o `.text-primary`) |
| `secondary-text` | `#2E4F55` / `#9CC4C7` | **8.15:1** (`8.76:1` s/blanco) / **10.02:1** (D) | Texto secundario con matiz de marca | `text-secondary-text` (o `.text-secondary`) |
| `success-text` | `#166534` / `#4ADE80` | **6.62:1** (`7.16:1` s/blanco) / **11.03:1** (`10.04:1` s/`content1` D) | Texto e indicadores de éxito o verificación | `text-success-text` |
| `warning-text` | `#92400E` / `#FBBF24` | **6.50:1** (`7.03:1` s/blanco) / **11.79:1** (`10.48:1` s/`content1` D) | Texto de advertencia o pendiente | `text-warning-text` |
| `danger-text` | `#B91C1C` / `#F87171` | **5.99:1** (`6.47:1` s/blanco) / **6.99:1** (`6.32:1` s/`content1` D) | Texto de error o alerta destructiva | `text-danger-text` |
| `danger` | `#DC2626` / `#F87171` | **4.83:1** con `#FFFFFF` (L) / **7.79:1** con `#0B0F14` (D) | Botones y badges destructivos sólidos | `bg-danger text-danger-foreground` |
| `secondary` | `#3A6169` / `#3A6169` | **6.79:1** con `#FFFFFF` | Acento complementario (teal, escala 50–900 disponible) | `bg-secondary text-secondary-foreground` |
| `focus` | `#1D6478` / `#46C0D9` | **6.67:1** s/blanco (L) / **8.16:1** s/`content1` (D) | Anillo de foco accesible (`outline-focus` y `:focus-visible`) | `focus-visible:outline-focus` |
| `background` | `#F5F7F8` / `#0B0F14` | — | Fondo de página | `bg-background` |
| `foreground` | `#101826` / `#F5F7F8` | > 15:1 | Texto principal | `text-foreground` |
| `content1` | `#FFFFFF` / `#141A22` | — | Cards, navbar, superficies | `bg-content1` |
| `default-200` | `#E4E4E7` / `#2A3340` | — | Bordes suaves | `border-default-200` |
| `default-300` | `#D4D4D8` / `#3F4652` | — | Bordes visibles | `border-default-300` |
| `default-400` | `#63636B` / `#9A9AA5` | **5.45:1** (`5.86:1` s/blanco, `4.70:1` s/`default-200`) / **6.28:1** s/`content1` (D) | Metadatos terciarios, placeholders e iconos secundarios (≥ 4.5:1 incluso sobre `content3`/`default-200`) | `text-default-400` |
| `default-500` | `#52525B` / `#B4B4BE` | ≥ 6.2:1 | Texto secundario / muted | `text-default-500` |
| `default-600` | `#3F3F46` / `#C4C4CC` | ≥ 8.5:1 | Subtítulos y etiquetas de soporte | `text-default-600` |
| `default-900` | `#0F1213` / `#0A0D10` | — | Footer, secciones oscuras | `bg-default-900` |

### Degradados y sombras

| Token | Clase | Uso |
|-------|-------|-----|
| `bg-gradient-brand` | fondo degradado celeste → teal | Botones/CTAs destacados, badges premium |
| `bg-gradient-radial-brand` | halo radial celeste sutil | Fondo detrás del hero, secciones destacadas |
| `bg-gradient-surface` | degradado blanco → gris muy sutil | Cards con relieve suave sin usar imagen |
| `shadow-soft` | sombra baja, casi imperceptible | Cards en reposo |
| `shadow-elevated` | sombra amplia y difusa | Cards en hover / modales destacados |
| `shadow-glow` / `shadow-glow-lg` | resplandor celeste | CTAs primarios, elementos que necesitan foco |

### Reglas de color

- ❌ No usar `text-black`, `text-gray-*`, `text-slate-*`, `bg-white`, ni hex sueltos (`#0f1213`) fuera del bloque "papel" de vista previa de contrato.
- ❌ **Sobre `bg-primary` usar siempre `text-primary-foreground`; nunca `text-white`** (`#FFFFFF` sobre `#46C0D9` solo da 2.14:1).
- ✅ Usar `text-primary-text`, `text-success-text`, `text-warning-text` y `text-danger-text` cuando el color semántico se aplique a texto sobre `bg-background`, `bg-content1` o tintes suaves (`bg-primary/10`, `bg-*-50`).
- ✅ Sobre imágenes oscuras con overlay garantizado se permite `text-white` / `border-white/40`.
- ✅ Usar `bg-gradient-brand` con moderación (1–2 elementos por vista) para mantener la jerarquía visual.

## Tipografía

**Una sola familia** en toda la app: **Geist Sans** (`font-sans`, aplicada globalmente en `body`).

| Nivel | Clases | Uso |
|-------|--------|-----|
| Hero / H1 | `text-3xl md:text-4xl font-bold tracking-tight leading-tight` | Títulos principales |
| Sección / H2 | `text-2xl md:text-3xl font-bold tracking-tight` | Títulos de sección |
| Card / H3 | `text-lg font-bold` | Subtítulos en cards |
| Body | `text-base` (16 px) | Párrafos e **inputs en móvil** (evita auto-zoom en iOS) |
| Body compact | `text-sm` (14 px) | Contenido de decisión, tablas, descripciones secundarias |
| Muted | `text-sm text-default-500` | Texto secundario |
| Label | `text-xs md:text-sm font-semibold` | Labels de formulario y navegación |
| Metadatos / Badges | `text-xs` (12 px) | **Tamaño mínimo absoluto**, solo para metadatos o chips |
| Números / cifras | `font-bold tabular-nums leading-none` | Contadores, pasos, precios |

### Reglas tipográficas

- ❌ Prohibido usar tamaños arbitrarios menores a 12 px (`text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[0.6rem]`).
- ❌ Evitar `uppercase tracking-widest` en etiquetas de formulario, tablas de datos o textos de más de 3 palabras.
- ✅ En móvil, todo `<input>`, `<select>` y `<textarea>` debe tener al menos `text-base` (16 px).

## Accesibilidad (Requisitos obligatorios)

1. **Un único `<main>` por página**: definido en `src/app/layout.tsx` con `id="contenido"` y enlazado desde el enlace `"Saltar al contenido"`. Las vistas internas usan `<div>` o `<section>`.
2. **Touch targets ≥ 44 × 44 px**: los controles primarios, botones solo-icono, cierres de modal, controles de pausa y navegación móvil deben alcanzar mínimo `2.75rem` (`44px`, clase `.touch-target` o `min-h-11 min-w-11`). En tablas densas de escritorio o chips secundarios se permite `size="sm"` (`32px`), con objetivo progresivo de `44px` en vistas táctiles.
3. **Foco visible (`:focus-visible` y `focus` de HeroUI)**: tanto el token `focus` de HeroUI (`outline-focus`) como el anillo global `:focus-visible` en `@layer base` usan `#1D6478` en tema claro (6.67:1 sobre blanco) y `#46C0D9` en tema oscuro (8.16:1). Nunca aplicar `outline-none` sin reemplazo `:focus-visible`.
4. **Movimiento reducido (`prefers-reduced-motion`)**: `MotionConfig reducedMotion="user"` está activo en `providers.tsx` y `globals.css` neutraliza animaciones CSS. Los carruseles o rotadores automáticos deben pausarse o incluir control explícito.
5. **Controles solo-icono y `Switch`**: todo `<Button isIconOnly>` y `<Switch>` sin texto visible debe incluir `aria-label` descriptivo en español; los iconos decorativos llevan `aria-hidden="true"`.
6. **Formularios y errores**: asociar siempre `<label>` visible, `inputMode` y `autoComplete` apropiados, mostrar errores junto al campo (`isInvalid` + `errorMessage`) y anunciar resúmenes críticos con `role="alert"`.
7. **Confirmación de acciones destructivas**: usar `ConfirmDialog` (`src/components/ui/confirm-dialog.tsx`) en lugar de `window.confirm()`.

## Espaciado y layout

| Patrón | Clases | Uso |
|--------|--------|-----|
| Offset navbar | `pt-28` | Contenido bajo navbar fija |
| Padding horizontal | `px-4 md:px-8` | Páginas y secciones |
| Sección vertical | `py-20` | Bloques de contenido |
| Ancho contenido | `max-w-content mx-auto` | Secciones amplias (80rem) |
| Ancho footer | `max-w-footer mx-auto` | Footer (75rem) |
| Grid home | `gap-6` | Masonry de músicos |

## Border radius

| Token HeroUI | Valor | Uso |
|--------------|-------|-----|
| `radius="sm"` | 0.5rem | Elementos pequeños |
| `radius="md"` | 0.75rem | Botones navbar, inputs |
| `radius="lg"` | 2rem | Cards, HeroUI large |
| `rounded-2xl` | 1rem | Cards de panel y modales (`UI.card`) |
| `rounded-4xl` | 2rem | Cards editoriales públicas (hero, músicos, process) |
| `rounded-full` | — | Pills, avatares, CTAs redondos |

## HeroUI — componentes y cuándo usarlos

```tsx
import {
  Accordion,
  Autocomplete,
  Button,
  Card,
  Chip,
  Dropdown,
  Input,
  Modal,
  Pagination,
  Select,
  Switch,
  Table,
  Tabs,
  addToast,
} from "@heroui/react";
```

| Componente | Cuándo |
|------------|--------|
| `Button` | CTAs, acciones de barra, formularios (`text-primary-foreground` sobre `color="primary"`) |
| `Input` / `Select` / `Autocomplete` | Campos de formulario con `label`, `isInvalid`, `errorMessage`, `inputMode` |
| `Card` | Contenedores con borde/sombra (`UI.card` en paneles) |
| `Modal` / `ConfirmDialog` | Diálogos, flujos en paso y confirmaciones destructivas (`aria-label="Cerrar"`) |
| `Dropdown` | Menús contextuales de usuario y acciones secundarias |
| `Tabs` | Filtros de bandeja por estado o secciones hermanas en paneles |
| `Chip` | Estados semánticos (siempre con icono o prefijo textual además de color) |
| `Table` / `Pagination` | Listados tabulares en escritorio (acompañar de vista de tarjetas en móvil y `<th scope="col">`) |
| `Switch` | Preferencias booleanas inmediatas (siempre con `aria-label` o etiqueta visible) |
| `Accordion` | Preguntas frecuentes y bloques colapsables secundarios |
| `addToast` | Confirmaciones no bloqueantes y errores de red (nunca como único indicador de error de campo) |

## Utilidades compartidas (`src/lib/`)

| Archivo | Propósito |
|---------|-----------|
| `src/lib/ui-classes.ts` | Constantes `UI.card`, `UI.input`, `UI.select`, `UI.modal`, `UI.skeleton` para mantener consistencia entre paneles |
| `src/lib/booking-labels.ts` | Etiquetas de estado (`BOOKING_STATUS_LABELS`), etiquetas por rol (`getBookingStatusLabel(status, role)`) y microcopy de siguiente paso (`getBookingStatusHint(status, role)`) |
| `src/components/ui/confirm-dialog.tsx` | Modal accesible reutilizable para confirmar rechazos, suspensiones, despublicaciones o eliminaciones |

## Archivos clave

| Archivo | Responsabilidad |
|---------|-----------------|
| `tailwind.config.ts` | Tokens de color, contraste, radius y fuentes |
| `src/app/globals.css` | Variables semánticas `:root`/`.dark`, `:focus-visible`, `.touch-target`, `prefers-reduced-motion` |
| `src/app/layout.tsx` | Fuente Geist, skip-link `#contenido`, metadata, `lang="es"` |
| `src/app/providers.tsx` | `HeroUIProvider` (`locale="es-PE"`), `MotionConfig` (`reducedMotion="user"`) |
