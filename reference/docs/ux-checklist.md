# UX Quality Checklist

Run through this after ANY UI change. Fix issues immediately — do not leave for a separate pass.

## Visual Affordance
- [ ] Every `<button>` has bg color, border, or shadow — never plain text styling
- [ ] Every clickable element uses `<button>` or `<a>`, not `<div onClick>` or `<span onClick>`
- [ ] Primary CTAs use `bg-brand-orange text-white` with shadow
- [ ] Secondary actions use `bg-brand-blue text-white` or `variant="outline"` with visible border
- [ ] Ghost buttons have a hover state AND an icon to indicate interactivity
- [ ] "Add as custom item" or similar fallback actions are visually distinct buttons, not muted text

## Design Tokens (no raw Tailwind colors)
- [ ] No `text-gray-*`, `text-slate-*`, `text-zinc-*` — use `text-text-primary`, `text-text-secondary`, `text-text-muted`
- [ ] No `bg-gray-*`, `bg-slate-*` — use `bg-surface`, `bg-surface-secondary`
- [ ] No `border-gray-*` — use `border-border-custom`
- [ ] Cards use `shadow-brand` (not `shadow-sm`, `shadow-md`, `shadow-lg`)
- [ ] Cards use `rounded-xl` (iOS standard — not `rounded-md` or `rounded-lg`)
- [ ] No raw hex colors in className (`bg-[#...]`) — use a design token

## Mobile (375px)
- [ ] No more than 3 items in a horizontal `flex` row without `flex-wrap`
- [ ] No fixed widths > 320px that could overflow on mobile
- [ ] All touch targets >= 44px height (h-10 minimum for buttons)
- [ ] Primary CTA is full-width or visually prominent on mobile
- [ ] No text truncation that hides critical information (product names, job names)
- [ ] Labels stack above controls on narrow screens (not side-by-side with long labels)

## Copy & Labels
- [ ] Button labels are specific ("Create BOM", "Confirm Match" — not just "Submit" or "OK")
- [ ] Directional references ("below", "above", "here") match actual layout position
- [ ] Error messages explain what went wrong AND what to do about it
- [ ] Empty states have a helpful message + action button
- [ ] Loading states describe what's happening ("Finding matches..." not just "Loading...")

## Consistency (compare to existing pages)
- [ ] Same card shadow style as other cards on similar pages
- [ ] Same tab/segmented control style as other pages with tabs (segmented, not underline)
- [ ] Same spacing rhythm (p-4 on cards, gap-3 or gap-4 between cards)
- [ ] Same filter pill style (brand-blue active, surface-secondary inactive)
- [ ] Status badges use the same component/colors as elsewhere
- [ ] Icons from Lucide React, consistent sizing (h-4 w-4 inline, h-5 w-5 standalone)

## Animations
- [ ] New elements use `animate-fade-in-up` with stagger classes
- [ ] Cards have `active:scale-[0.98]` press feedback
- [ ] Cards have `hover:shadow-brand-md transition-all duration-300`
- [ ] Dropdowns use `animate-dropdown-in`
- [ ] Expanding sections use `animate-ios-expand`
