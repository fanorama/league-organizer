# League Organizer — Design Constitution

## Register

**Product.** This is an admin tool, not a marketing surface. The interface is the instrument. Operators who open this screen daily should move without thinking.

## Users

- **Primary:** League admin. Organizes multiple football leagues, manages teams, assigns players, runs seasons, inputs scores. Under time pressure during league sessions. Needs fast, repeatable workflows.
- **Secondary:** Visitor. Read-only access to standings, player stats, match schedules. No pressure — consuming, not operating.

## Voice

Indonesian-first, direct, functional. No marketing fluff, no exclamation points, no filler transitions. Button labels are verbs: "Spin wheel", "Import clubs", "Assign", "Save score". Empty states teach the space: "No pool teams. Add teams manually or import clubs."

## Composition Lanes

The app has four dominant work patterns. Different screens need different compositions — do not default to centered hero + card grid.

- **Operate** (TeamsPage, SeasonPage score input, SpinWheel): Command-like flows. Actions sit close to the object they operate on. Dense list rows with inline controls. Popovers and panels, not page-navigating modals.
- **Compare** (Standings tab, PlayersPage leaderboard, PlayerPage H2H): Tables and ranked lists. Stable scanning lanes. Sort controls near the data, not floating.
- **Configure** (LeaguePage season creation, team import, playoff setup): Grouped settings with preview. Clear commit. Side panels for detail.
- **Monitor** (SeasonPage schedule): Status boards with live priority. Match cards with score input near each match.

## Visual Foundation

- **Palette:** Deep navy-black surface (`#0a0d14`), layered with subtle raised panels (`#131720`, `#1a2030`). Warm gold primary (`#f0b429` — action, active, selected). Sharp red accent (`#e03050` — danger, elite tier). Green (`#26a96c`) for success states and underdog tier.
- **Type:** Barlow (sans-serif body), Barlow Condensed (headings, badges, buttons). Uppercase + letter-spacing on badges and nav items for scannable micro-labeling.
- **Depth:** Subtle radial background gradients. Top accent bar on header (primary → accent gradient). Panels with 1px borders, never heavy shadows on static elements. Modals and popovers get real shadow.
- **Radius:** 6px default, 10px large. Tight and precise, not pill-soft.
- **Grid:** 1200px max content width. `two-col` layout for operate screens (main panel + sidebar card). `grid` auto-fill for league/player cards. Pool team rows use CSS grid inline for compact control layout.

## Component Rules

- **Badges** signal status or category inline. Use the existing `.badge` system with `.success`, `.warning`, `.danger` modifiers. Do not invent new badge colors without adding a system-level modifier.
- **Buttons** follow the existing hierarchy: `.primary` (gold, commit actions), default `.btn` (neutral), `.danger` (destructive), `.btn-xs` (inline controls). All caps, 11px, 700 weight, 0.07em letter-spacing.
- **Popovers** (tier menu, assign dropdown) are the preferred pattern for inline actions. They open from the trigger, close on click-outside or Escape, animate with scale+fade, and restore focus to trigger.
- **Modals** are for interruptions that need context isolation: import clubs, spin wheel. Not for simple selects.
- **Cards** are for discrete, self-contained entities: leagues, seasons. Not for everything. Pool teams are list rows, not cards, because they share a panel context.

## Accessibility

- Focus rings are 2px solid primary, offset 2px from element. Visible on all interactive controls.
- Touch targets: pool row action buttons are min-height 28px with full-width tap areas. Popover menu items fill the row width.
- Keyboard: Tab order follows visual flow. Enter/Space to activate. Escape to close overlays. Arrow keys in role="menu" groups.
- Color: tier states use both color (danger/success/neutral) and label text. The combination ensures colorblind users can distinguish Elite/Mid/Underdog.

## Anti-References

- No centered hero sections. This is a tool, not a landing page.
- No card-inside-card nesting. Flatten with dividers and type.
- No cream-and-purple SaaS palette. The dark gold-and-steel palette is intentional.
- No loading spinners replacing entire layouts. Every loading state preserves the skeleton of what will appear.
- No placeholder-only form labels. Labels are always visible above inputs.
- No AI-generated generic illustrations or decorative icons that carry no domain meaning.
