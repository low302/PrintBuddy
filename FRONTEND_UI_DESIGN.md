# WheelTrack2 Frontend UI Design Spec

This document captures the current frontend UI design so it can be reused as a prompt or blueprint for another project while keeping the look and behavior consistent.

**Product Context**
Inventory manager for Subaru OEM wheels and tires. The UI feels like a clean ops dashboard with a strong left navigation, data tables, and focused modal workflows.

**Visual Direction**
Clean, modern, utilitarian inventory dashboard.
High contrast between the black navigation and the light content area.
Neutral palette, minimal color, emphasis on readability and data density.
Soft but crisp rounding and shadowing.

**Typography**
Primary font stack: `Aptos`, `Segoe UI`, `Inter`, `Helvetica Neue`, `Arial`, `system-ui`.
Monospace for SKUs and numeric identifiers: `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`.
Hierarchy:
Page title: `text-2xl`, `font-bold`, slight tracking tight.
Section titles: `text-lg`, `font-semibold`.
Body: `text-sm` for most table and form content.
Microcopy: `text-xs` with `text-muted-foreground`.

**Color System**
Overall theme is neutral grayscale. Primary is near-black. Background is white.
Key tokens (from CSS custom properties):
`--background`: white.
`--foreground`: near-black.
`--primary`: near-black.
`--primary-foreground`: near-white.
`--secondary`: very light gray.
`--muted`: very light gray.
`--border`: light gray.
`--destructive`: red for delete/danger.
Sidebar colors use Tailwind neutrals: `bg-black`, `border-neutral-800`, `text-neutral-50/400`.

**Spacing, Radius, and Borders**
Base radius: `0.625rem`.
Typical rounding: `rounded-md` and `rounded-lg` for inputs, buttons, cards.
Card: `rounded-xl` with `border` and `shadow-sm`.
Borders are subtle light gray in content; darker neutral borders in sidebar.

**Layout**
Full-height, two-column layout.
Left navigation: two layers.
Icon strip (desktop only): 64px wide, black background, icon-only navigation.
Detail sidebar: 256px wide, collapsible to 64px on desktop; slide-in drawer on mobile.
Main content area: flexible width, white background, vertical scroll.
Header: sticky-feeling top bar with page title, subtext, and action buttons.

**Navigation**
Icon strip shows:
Logo (WT), Wheel and Tire icons, Settings icon, user avatar.
Detail sidebar includes:
Title + collapse chevron.
Search bar with inline "Clear".
Quick Actions section with Add button.
Filter chips (Status, Condition, Size).
Saved searches input + chips.
Inventory section (Available Sets, Loose Wheels, Sold).
Mobile has a top mini-menu and close button.
Sidebar motion uses soft-spring easing and 500ms transitions.

**Primary Content**
Header:
Title changes based on active section.
Subtext shows inventory counts.
Actions: `Add Wheel/Tire`, `Menu` on mobile.

Cards:
Single card wrapping the table.
Card content padding top aligns table with the header.
Selection toolbar appears when rows are selected.

Tables:
Inventory tables with checkbox selection.
Row hover highlights with muted background.
Responsive column visibility:
Some columns hidden on small screens.
Tables have min-width to allow horizontal scroll on mobile.

Badges:
Condition and status show in pill badges.
Variants:
`default` for Excellent.
`secondary` for Good.
`outline` for Fair.
`destructive` for Poor or Sold.

Buttons:
Variants: `default`, `secondary`, `outline`, `ghost`, `destructive`.
Small sizes for table actions and toolbars.
Icon buttons are square and compact.

**Forms and Inputs**
Inputs: 36px tall, rounded, subtle border.
Selects: consistent height with inputs, clean dropdown with subtle shadow.
Textareas: soft border, multiline, text-sm.
Labels: small, bold-ish (`text-sm font-medium`).

Wheel Form (modal):
Large modal, scrollable content.
Grid layout with responsive columns.
Photo upload area and photo URL list.
Conditional "Sold" section with dashed border.
Footer with Cancel (outline) and primary action.

Tire Form (modal):
Smaller modal, compact grid fields.
Footer with Cancel and Save.

**Wheel Detail Modal**
Wide modal, two-column layout on large screens.
Left column:
Summary card with badges and pricing.
Spec list with label-value pairs and monospaced SKU.
Set breakdown with totals.
Optional notes section.
Right column:
Photo preview card.
Thumbnail grid with drag reorder mode.
Inline actions for cover selection and removal.
Primary actions: Edit, Mark Sold, Print Labels.

**Settings Modal**
Compact single-column grid of settings:
Company Name.
Customers list with removable chips.
Printer profile select.
Label margin inputs (grid of 4).
Import CSV actions.
Scanner, Photo Library, Backup, Reports.
Activity log panel with scroll and "Clear".

**Importer Modal**
Large modal with:
Import type select.
File upload input.
Column mapping with small selects.
Preview table in a bordered box.
Actions aligned right.

**Scanner Modal**
Camera preview in a black rounded box.
Start/Stop controls.
Error text in destructive color.

**Photo Library Modal**
File upload.
Grid of square thumbnails.
Selection ring for chosen images.
Assign button disabled unless a wheel is selected.

**Reports Modal**
Small summary cards for KPIs.
Inline bar charts using simple SVG.
Date filters.
Export and Print actions.
Inventory aging list.

**Print Labels**
Print-specific CSS for 2x2 and 2x4 label sizes.
Two labels per wheel: QR label and details label.
Monospace SKU, bold title, thin divider, clean alignment.

**Motion and Interaction**
Sidebar collapse and hover states use `transition-all` with a soft-spring cubic-bezier.
Dialogs fade and zoom in.
Table rows highlight on hover.
Chips and badges have subtle hover color shifts.

**Responsiveness**
Sidebar collapses on desktop and becomes a slide-in drawer on mobile.
Tables are horizontally scrollable on small screens.
Header actions stack on mobile.
Cards and forms switch to 1-column layouts on small widths.

**Component Library Notes**
UI primitives align with Shadcn/Radix patterns.
Consistent `data-slot` usage for components.
Tailwind-based class system with variant support via `cva`.

**Design Prompt Summary**
Build a light, data-dense inventory dashboard.
Use a black, collapsible left sidebar with icon strip + detail panel.
Main area is white with a simple header, action buttons, and a carded table.
Use neutral grays, minimal color accents, and strong text hierarchy.
Provide modal-driven workflows for add/edit/detail, settings, import, and reports.
Ensure mobile works with a slide-in drawer and horizontal table scroll.
