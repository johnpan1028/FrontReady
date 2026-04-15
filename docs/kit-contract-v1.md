# Kit Contract v1

## 1. Purpose

This document defines the minimum contract every reusable card or kit must satisfy before it can enter the platform asset library.

The goal is not to collect visually pretty snippets.

The goal is to admit only assets that can:

- render clearly in the editor
- stay composable inside page shells
- map into the export stack
- be understood by AI coding without guesswork

---

## 2. Product Position

In this platform:

- the **platform shell** is fixed
- the **asset library** is the production toolchain
- the **user project** is assembled from reusable kits, cards, and controls

Therefore a kit is not just a visual block.

It is a **frontend contract carrier**.

---

## 3. Required Fields

Every built-in or imported kit/card must define:

- `id`: stable template identifier
- `name`: user-facing asset name
- `layer`: `kit` or `card`
- `source`: where it comes from
- `category`: what kind of problem it solves
- `description`: short operational description
- `data`: actual node tree

---

## 4. Required Runtime Qualities

Every admitted asset must satisfy all of these:

### A. Clear shell boundary

The asset must have an explicit root shell.

- Card assets use a card shell root
- Kit assets use a section/container root

No orphan children.

### B. Stable IDs

All important nodes must have stable IDs.

This is mandatory for:

- AI handoff
- export mapping
- future binding and action targeting

### C. Token-friendly styling

The asset must be theme-token friendly.

It cannot hardcode brand colors in a way that breaks project theming.

### D. Editable structure

The asset must remain editable in:

- page canvas
- kit studio

No black-box behavior.

### E. Handoff intent

The asset must expose an `aiHandover` intent on the root or key sub-blocks.

That text should explain what AI coding needs to finish later.

---

## 5. Source Policy

### Allowed first-tier sources

- `native`
- `shadcn`
- `react-day-picker`
- `recharts`

Later we can add more, but only after validation.

### Source treatment rule

External sources are never exposed raw.

They must be absorbed into platform syntax:

- shell
- controls
- bindings
- actions
- AI handoff

---

## 6. Asset Categories

v1 uses these categories:

- `topology`
- `starter`
- `layout`
- `editorial`
- `data`
- `content`
- `form`
- `foundation`
- `published-kit`

These categories are for procurement, filtering, and future registry growth.

---

## 7. Surface Availability

Assets must explicitly declare where they are usable:

- `pages`
- `canvas`
- `kits`

### Current rule

- `Pages Board` only accepts topology assets: shells and blueprints
- `Canvas` accepts content assets: kits, cards, controls, published kits
- `Kit Studio` accepts content assets: kits, cards, controls, published kits

This separation is a product rule, not just a UI preference.

---

## 8. Export Mapping

Every admitted asset must be able to survive export into the standard deliverable stack:

- `React`
- `TypeScript`
- `Vite`
- `React Router`
- `Tailwind / tokens`
- `Zustand`
- `TanStack Query`
- `Zod`
- adapter layer

If an asset cannot be explained or represented cleanly in that stack, it should not enter the library.

---

## 9. Acceptance Checklist

Before a kit/card becomes official, verify:

- the preview is visually clear at `scale(1)`
- drag/drop does not crash nested editing
- IDs remain stable
- theme tokens still apply correctly
- AI handoff text is present
- exported structure is understandable

If any of the above fails, the asset is still experimental.

