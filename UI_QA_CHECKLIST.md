# UI QA Checklist (Enterprise)

## Viewports
- Desktop: `1440x900`
- Tablet: `1024x1366`
- Mobile: `390x844`

## Global
- Header height is consistent across routes.
- Brand/logo, avatar alignment, and spacing match 8px system.
- No horizontal scrolling at any viewport.
- Animations are smooth and do not block interactions.
- `prefers-reduced-motion` disables transitions/animations correctly.
- Color contrast is readable for title/body/button text.

## Dashboard (`#dashboard`)
- Hero title wraps cleanly and does not overlap cards.
- Stats card grid:
  - Desktop: 3 columns
  - Tablet: 2 columns
  - Mobile: 1 column
- Card icons stay inside bounds on all breakpoints.
- Action cards maintain equal vertical rhythm and hover states.
- Recent activity rows align icon/title/date/chip correctly.

## Form Pages (`#publication`, `#fdp`, `#conference`, `#workshop`, `#patent`)
- Gradient header has consistent corner radius and padding.
- Inputs align in 2 columns on large screens and stack on mobile.
- Label sizes and input heights are consistent.
- Upload area remains visible and centered at all sizes.
- Action buttons align right on desktop and stack cleanly on mobile.

## Reports (`#reports`)
- Metric tiles follow same sizing rhythm as dashboard cards.
- Bar chart/progress rows scale correctly and remain readable.
- No clipping for labels or values on smaller screens.

## Search (`#search`)
- Search input and category select align side-by-side on desktop.
- Controls stack in correct order on mobile.
- Empty state and populated results render with consistent spacing.

## AI Assistant (`#ai`)
- Card spacing is uniform and follows 8px step rhythm.
- Button sizes and icon alignment are consistent.
- Text blocks do not overflow card boundaries.

## Functional
- Dashboard loads without backend crash (memory fallback or Postgres).
- Creating a new item from form updates dashboard counts.
- Search returns expected results by keyword and category.
- Reports update after new entries are created.

## Final Sign-off
- Visual pass approved on all three viewports.
- Interaction pass approved (clicks, navigation, forms).
- Accessibility quick pass approved (focus rings, readable text, reduced motion).
