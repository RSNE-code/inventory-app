# Design Brief: RSNE Inventory App iOS Polish

## Target Experience
A modern iOS-native web app that feels like a professional tool — clean, fast, confident.

## Design References

### 1. Vibecode
- **What we love:** Smooth transitions, "Building..." states with animations
- **Apply to:** BOM creation flow — "Building BOM..." with progress animations
- **Link:** https://mobbin.com/apps/vibecode-ios-11ccb90c-15e1-4dc7-9252-10b49102d5aa/583c2e55-b63a-43d9-833b-fbede52ea9d2/screens

### 2. Things 3
- **What we love:** Flows, popup patterns, easy checkboxes/circles
- **Apply to:** Item selection (circles), modal sheets (popup patterns), BOM review flow
- **Pattern:** Bottom sheets for editing, not inline overlays

### 3. Apple Notes
- **What we love:** Simplicity, clean look
- **Apply to:** Overall aesthetic — system fonts, generous whitespace, minimal chrome

### 4. Monday
- **What we love:** Super clean, bright cards, clear use of color to highlight
- **Apply to:** Product cards, BOM items — use color intentionally (status, categories)
- **Link:** https://mobbin.com/apps/monday-com-ios-4742d0f4-2f92-40e7-a76f-117611171254/55b9bc51-31e9-436f-9968-7845e81d4cc2/screens

## Critical Bugs to Fix First
1. **Dropdown glitching/flashing** when typing in search
2. **Random letter prefix** appearing on confirmed items (e.g., "s TWS Cover Plate")
3. **Truncated item names** with ellipses — need full visibility or better truncation

## Design Principles
- **Clean over clever** — no unnecessary decoration
- **Gestural** — swipe, tap, drag where appropriate
- **Color with purpose** — status indicators, not decoration
- **Smooth transitions** — spring-based, ~0.3-0.4s
- **Generous spacing** — iOS 8/16/24pt grid
- **Typography hierarchy** — clear size/weight differences

## Components to Rebuild
1. **Search dropdown** — fix glitching, make it feel like iOS Spotlight
2. **Product cards** — Monday-style bright cards with clear info hierarchy
3. **Item selection** — Things 3 style circles/checkboxes
4. **Modal sheets** — Things 3 style bottom sheets for editing
5. **BOM creation flow** — Vibecode-style "Building BOM..." animations
6. **Status indicators** — clear, colorful, purposeful

## Tech Constraints
- Next.js + Tailwind + Capacitor (no React Native)
- Maintain existing RSNE business logic
- Mobile-first (but works on desktop)
