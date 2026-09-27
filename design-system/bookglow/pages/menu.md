# Menu & Inventory

> Page override for `apps/merchant-portal/pages/Services.tsx`.

## Segmented catalog tabs

Use `OverlayTabs` `variant="segmented"` `layout="equal"` for **Services | Products | Packages**.

- Full-width on phone; equal columns; selected tab is brand fill + on-brand text (not colour-only).
- Do not hug content on the left (`flex: 0 0 auto` / `min-width: max-content`).
- Members sort tabs (`Recent | New | Birthday | Name`) use the same primitive.

## Editor tabs

**Details | Pricing | Availability | Media** use `OverlayTabs` `layout="equal"` with the underline variant.

- Four equal columns inside the editor drawer.
- Active: brand colour + underline (shape + colour).
- Phone caption-sized labels so Availability fits 320–427px.

## Category selector

`CategorySelect` — never default new items to Massage.

- Empty value shows **Select category**.
- Menu includes **+ Add new category** (or **Create your first category** when the list is empty).
- Creating a category must not reset unsaved editor fields.

## Category management

Compact entry: Tags icon on the phone toolbar; **Categories** text button on desktop (no second Rearrange button).

`CategoryManagerModal`: add, rename, delete, drag-reorder. Delete never removes catalog rows. Used categories must be reassigned (including **Uncategorized**).

## Compact boolean row

`BooleanSettingRow` for single flags such as **Commission eligible**. Do not wrap one checkbox in `.m-editor-card`.

## Currency

Menu prices use **RM**. Do not label fields `Price ($)`.
