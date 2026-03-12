# Album Collective Design Guide

## Source of truth
Use the images in `/design-reference` as the visual source of truth.

Current primary reference:
- `catalog-reference.png`

## Overall style
- Dark, premium, modern music app
- Cinematic feel with soft glow and subtle depth
- Minimal but tactile UI
- Album art is the hero
- Rounded corners throughout
- Soft gradients and low-contrast surfaces
- Clean, polished, slightly playful but not flashy

## Layout
- Left sidebar navigation
- Top centered search bar
- Top-right profile/avatar
- Filter bar directly below top nav
- Main content area contains a titled album grid
- Bottom centered "Load More" button

## Left sidebar
- Vertical stack of rounded nav buttons
- Primary nav items:
  - Home
  - Catalog
  - Stats
- Secondary controls pinned lower:
  - Theme
  - Drop Link
- Active state is a brighter filled pill/button
- Inactive state is darker, subtle, still elevated

## Top bar
- Small brand mark/logo on top-left
- Search bar centered at top
- Search bar text: "Search or Paste Album"
- Rounded search field with subtle transparency/glow
- Circular avatar on top-right

## Filter bar
- Rounded pill controls
- Includes:
  - item type filter
  - year filter
  - rating filter
  - sort dropdown
  - friend/multi-friend control
  - grid density slider/toggle
  - reset button
- Filters should feel compact, premium, and evenly spaced
- Bar sits inside a rounded dark container

## Main content
- Title: "Albums"
- Large card grid
- Dense but breathable spacing
- Cards have:
  - album cover
  - album title
  - artist
  - year
- Cards feel elevated with soft shadow and dark surface
- Covers should have rounded corners
- Text hierarchy:
  - title more prominent
  - artist smaller and dimmer
  - year aligned to the right and subdued

## Grid behavior
- Adjustable grid density
- Should support larger and smaller card layouts
- Grid should remain visually clean at all densities
- Default state should feel similar to the reference image

## Visual style details
- Background is deep near-black with subtle blue/teal gradient glow
- Panels are dark charcoal with soft transparency
- Corners are generously rounded
- Buttons and pills have a glassy/soft-surface feel
- Borders should be subtle, not harsh
- Use blur/translucency carefully where appropriate
- Avoid bright white panels or flat generic dashboard styling

## UX rules
- Preserve the overall layout structure of the reference
- Do not redesign the page
- Match spacing and hierarchy closely
- Keep responsiveness, but preserve the visual character
- Desktop design should closely match the provided reference