---
name: AI Assist
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#25005a'
  on-tertiary-container: '#9863ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d2bbff'
  on-tertiary-fixed: '#25005a'
  on-tertiary-fixed-variant: '#5a00c6'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is tailored for an enterprise-tier, mission-critical customer operations environment. The visual identity projects high-precision intelligence, operational velocity, and unshakeable dependability. It balances the austere authority of traditional enterprise systems with the predictive, fluid dynamism of cutting-edge artificial intelligence.

The overall style fuses **Modern SaaS Minimalism** with targeted **Glassmorphism & Chromatic AI Accentuation**. Data displays, structural framing, and foundational navigation maintain quiet, crisp discipline using deep navy slate and razor-thin borders. Conversely, generative AI features, predictive ticket suggestions, macro drafts, and sentiment scoring break forward through soft violet luminosity, subtle internal specular glows, and micro-diffused ambient backdrops.

## Colors

The color architecture is built around clear cognitive domains:

- **Executive Primary (`#0F172A`, `#1E293B`)**: Serves as the bedrock for chrome, deep structural framing, headings, and high-emphasis controls. Communicates stability and deep system trust.
- **Royal Cobalt (`#2563EB`, `#1D4ED8`)**: The canonical interaction color for standard workflows, primary ticket actions, customer link states, and transactional triggers.
- **Intelligent Violet (`#7C3AED`, `#8B5CF6`, `#EDE9FE`)**: Reserved strictly for AI-originated elements. Never use this for standard user actions; its presence immediately signals automated classification, confidence scoring, synthesis, or generative replies.
- **Clean Slate Foundation (`#F8FAFC`, `#F1F5F9`, `#FFFFFF`, `#E2E8F0`)**: Crisp, low-fatigue slate backgrounds paired with pure white cards to optimize scanning speeds across dense 8-hour agent shifts.
- **Operational Semantics**:
  - **Resolved / Optimal**: Emerald (`#10B981`, soft tint `#ECFDF5`)
  - **In Review / Elevated**: Amber (`#F59E0B`, soft tint `#FFFBEB`)
  - **Urgent / SLA Breach**: Rose (`#EF4444`, soft tint `#FEF2F2`)

## Typography

The typographic hierarchy prioritizes rapid information consumption, precise metric comprehension, and scanability under cognitive load.

- **Typeface**: `Inter` is applied universally across display, body, and label layers for geometric precision and neutral clarity. `JetBrains Mono` handles ticket IDs, JSON payloads, regex configurations, and API logs.
- **Tabular Figures (`tnum`)**: Enable OpenType `font-variant-numeric: tabular-nums` globally across all metrics, timestamps, queue counts, and SLA timers to eliminate jitter and ensure exact vertical column alignment.
- **Density Discipline**: Headings and titles lean into tight, negative letter-spacing for sharp visual cohesion, while micro-labels utilize positive tracking with medium/semi-bold weights for high-legibility status identification.

## Layout & Spacing

The layout structure relies on a strict **3-Tier Fluid Grid System** engineered for multi-pane productivity:
1. **Tier 1 (Utility & Global Nav)**: Compact, collapsible vertical rail fixed at `64px` to `240px`.
2. **Tier 2 (Queue / Triage Stream)**: Fluid list spanning `320px` to `420px` with persistent overflow control.
3. **Tier 3 (Active Conversation & AI Copilot)**: Primary responsive canvas occupying all remaining screen real estate, split into a conversation feed (`60%`) and context/suggestion panel (`40%`).

### Breakpoints & Adaptive Behaviors
- **Mobile (< 768px)**: Strict single-pane focus. Left navigation converts to an off-canvas drawer. Agent views swap between list and detail via slide transitions. Gutters drop to `0.75rem`, margins to `1rem`.
- **Tablet (768px - 1199px)**: Dual-pane configuration. Navigation rail collapses to icon-only mode (`64px`), and queue splits side-by-side with conversation. AI copilot moves to a sliding contextual sheet.
- **Desktop (≥ 1200px)**: Full multi-pane productivity suite. Margins expand to `2rem` with `1.5rem` gutters. All three operational panes coexist without occlusion.

## Elevation & Depth

Visual hierarchy in this design system is driven by **Tonal Surface Stacking** accented by **Low-Intensity Ambient Shadows** and selective **Frosted AI Refraction**:

- **Level 0 (Canvas Base - `#F8FAFC`)**: Structural backdrop upon which all functional surfaces rest.
- **Level 1 (Card & Content Panes - `#FFFFFF`)**: Base interaction tier. Framed by a subtle border (`1px solid #E2E8F0`) and grounded with an ultra-soft ambient drop: `0 1px 3px 0 rgba(15, 23, 42, 0.05)`.
- **Level 2 (Hovered Records & Floating Menus)**: Elevated data states, tooltips, and action dropdowns. Rendered with `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modal Dialogs & Command Bar)**: Full overlay interaction points. Grounded with `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.04)` over a semi-transparent slate wash (`rgba(15, 23, 42, 0.4)`).
- **AI Copilot Tier (Glassmorphism & Indigo Radiance)**: AI-generated panels and inline suggestions sit slightly elevated above standard tickets using `backdrop-filter: blur(12px)`, a `rgba(255, 255, 255, 0.85)` surface fill, a vibrant top border (`1px solid rgba(124, 58, 237, 0.25)`), and an ambient purple glow: `0 8px 24px -4px rgba(124, 58, 237, 0.08)`.

## Shapes

The design system maintains a balanced, contemporary geometry with a standard base radius of `0.5rem` (`8px`):

- **Data Tables & Tight Controls (`rounded-sm` / 4px)**: Checkboxes, table cell status tags, micro-badges.
- **Standard Controls & Elements (`rounded` / 8px)**: Form fields, interactive buttons, conversation message bubbles, context cards.
- **Surface Containers (`rounded-lg` / 16px)**: Primary operational cards, copilot sidebars, ticket overview wrappers, modal dialogs.
- **Pill Containers (`rounded-full` / 9999px)**: Reserved strictly for status badges, SLA indicators, filter toggles, agent avatars, and floating macro chips.

## Components

### Buttons
- **Primary (System)**: Navy fill (`#0F172A`), white text, `8px` corner radius. Subtle hover shift to `#1E293B`.
- **Primary (Action)**: Royal Cobalt (`#2563EB`), white text. Focused, immediate ticket submission and customer reply states.
- **AI Action Button**: Intelligent Indigo (`#7C3AED`) background with a continuous subtle gradient overlay into `#8B5CF6`. Emits a faint glow (`box-shadow: 0 0 12px rgba(124, 58, 237, 0.35)`) on hover. Always preceded by a dedicated sparkle or synthesis glyph.
- **Secondary / Ghost**: Pure white surface, subtle slate border (`#E2E8F0`), slate text (`#1E293B`). Light hover fill (`#F1F5F9`).

### AI Suggestion Containers (Glassmorphic)
- **Structure**: Surface set to `rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(12px)`.
- **Framing**: `1px` border using `rgba(124, 58, 237, 0.2)`. A 2px gradient accent lines the top rim: `linear-gradient(90deg, #7C3AED 0%, #2563EB 100%)`.
- **Header**: Includes auto-confidence rating badge (e.g., "94% match"), summary headline, and quick action macros ("Apply Draft", "Insert Resolution Steps").

### Badges & Pill Chips
- **Semantic Pills**: Fully rounded (`9999px`), padding `2px 8px`, `11px` uppercase bold typography with tracking.
  - **Resolved**: Soft emerald tint (`#ECFDF5`), emerald text (`#047857`).
  - **In Progress**: Soft amber tint (`#FFFBEB`), amber text (`#B45309`).
  - **Urgent**: Soft rose tint (`#FEF2F2`), rose text (`#B91C1C`).
  - **AI Auto-Classified**: Soft violet tint (`#EDE9FE`), indigo text (`#6D28D9`), accompanied by an inline dot or sparkle icon.

### Form Inputs & Search Fields
- Crisp slate border (`#E2E8F0`) with white base.
- Focused state transitions border to Royal Cobalt (`#2563EB`) accompanied by a 3px outer ring with 15% opacity (`rgba(37, 99, 235, 0.15)`).
- AI prompt inputs within the copilot pane adopt an indigo focus ring (`rgba(124, 58, 237, 0.2)`).

### Cards & Queues
- Compact vertical stacking for queues. Active ticket selection is signaled by a solid 3px Royal Cobalt left boundary indicator and background `#F1F5F9`.
- Ticket thread messages display alternating card treatments: internal agent notes adopt a soft yellow-gray backdrop (`#FEFCE8`), customer inquiries use clean white (`#FFFFFF`), and AI-generated drafts are encased in the glassmorphic violet container.