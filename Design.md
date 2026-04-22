---
name: Athletic Minimalist
colors:
  surface: '#0f1415'
  surface-dim: '#0f1415'
  surface-bright: '#343a3a'
  surface-container-lowest: '#090f0f'
  surface-container-low: '#171d1d'
  surface-container: '#1b2121'
  surface-container-high: '#252b2b'
  surface-container-highest: '#303636'
  on-surface: '#dee4e3'
  on-surface-variant: '#bbc9c8'
  inverse-surface: '#dee4e3'
  inverse-on-surface: '#2c3132'
  outline: '#869393'
  outline-variant: '#3c4949'
  surface-tint: '#54d9d9'
  primary: '#54d9d9'
  on-primary: '#003737'
  primary-container: '#0bb0b0'
  on-primary-container: '#003c3c'
  inverse-primary: '#006a6a'
  secondary: '#a1cfce'
  on-secondary: '#023736'
  secondary-container: '#204e4d'
  on-secondary-container: '#90bdbc'
  tertiary: '#ffb691'
  on-tertiary: '#552100'
  tertiary-container: '#e68651'
  on-tertiary-container: '#5d2500'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#75f6f6'
  primary-fixed-dim: '#54d9d9'
  on-primary-fixed: '#002020'
  on-primary-fixed-variant: '#004f4f'
  secondary-fixed: '#bdebea'
  secondary-fixed-dim: '#a1cfce'
  on-secondary-fixed: '#002020'
  on-secondary-fixed-variant: '#204e4d'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783100'
  background: '#0f1415'
  on-background: '#dee4e3'
  surface-variant: '#303636'
typography:
  headline-lg:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  action-lg:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 16px
  gutter: 12px
---

## Brand & Style

The design system is built on the principles of speed, clarity, and athletic energy. It targets coaches, players, and parents who need to make decisions in seconds while on the move or on the field. The brand personality is "The Reliable Teammate"—functional, energetic, and unobtrusive.

The design style is **Minimalism** with a focus on high-readability and "tap-ability." It strips away unnecessary decorations to prioritize action. By shifting to a **Dark Mode** aesthetic, the UI reduces glare during night games and provides a premium, high-tech feel. The emotional response is one of organized calm and professional focus.

## Colors

The palette is optimized for a dark environment, ensuring high contrast without eye fatigue. The primary color is an **Energetic Teal**, symbolizing modern precision, vitality, and digital clarity. This color is reserved exclusively for primary actions, success states, and indicating positive availability.

The secondary palette utilizes **Muted Sage and Slate**, providing a sophisticated layer of hierarchy. A tertiary **Warm Terracotta** is introduced for specialized status indicators or accent features like "Pro" or "Tournament" markers. The neutral palette is built on balanced grays to provide soft separation of surfaces. Status colors for "declined" or "absent" should use a muted, dark-mode-optimized coral to maintain balance against the deep background.

## Typography

The design system utilizes **Public Sans**, a strong, neutral typeface that excels in reading performance and athletic branding. Its clean, geometric sans-serif structure provides a disciplined, modern look that remains legible even on small screens or in low-light conditions.

Headlines are tight and bold to establish immediate hierarchy. Body text is spaced generously to ensure that even at a glance—perhaps while standing on a sideline—the user can digest the schedule or roster. Labels use an all-caps treatment with slight tracking for a disciplined, "jersey-style" aesthetic.

## Layout & Spacing

This is a **Mobile-First Fluid** layout. The design system relies on a 4px baseline grid to ensure vertical rhythm. Content is housed within a standard container with 16px side margins to prevent elements from hitting the screen edge.

Layouts are vertically oriented, favoring a single-column stack of cards to facilitate easy thumb-scrolling. Spacing between cards is generous (16px) to maintain a sense of openness and prevent the UI from feeling cluttered. Alignment is strictly left-heavy for text content to aid rapid scanning.

## Elevation & Depth

To maintain the "extremely simple" requirement, the design system avoids complex shadows and stacked layers. Depth in the dark theme is created through **Tonal Layers** and **Low-contrast Outlines**.

Cards sit on a neutral background with a very subtle 1px border or a minimal, soft glow. This differentiates the clickable surface without adding visual weight. When an item is "active" or "selected," it may use a slight tonal shift (e.g., a subtle teal tint) rather than a higher elevation. This keeps the interface feeling flat, fast, and light.

## Shapes

The shape language uses a **Rounded** philosophy (0.5rem base) to convey a balance of modern energy and structural reliability. Buttons and high-level containers use noticeable radii to feel approachable and tactile. "One-tap" availability buttons for "Going" or "Not Going" should use larger corner radii (`rounded-xl` or 1.5rem) to maximize their appearance as distinct, interactive elements.

## Components

**Buttons:**
Primary buttons are full-width "one-tap" bars with white text on the primary teal background. Secondary buttons use a ghost style with a 1px sage-colored border.

**Availability Toggles:**
The core of the app. These are large, side-by-side card segments. "Going" uses a deep teal background with a bold white check; "Declined" uses a muted coral background. The tactile size must be at least 56px in height and use generous rounded corners to accommodate fast thumb taps.

**Cards:**
Events are displayed in dark cards. The date and time are highlighted in a high-contrast teal box on the left, with the event title and location to the right. Cards should not have more than three lines of text.

**Bottom Navigation:**
A clean, four-item navigation bar using 24px line-icons. The active state is indicated by the primary teal color and a small rounded indicator below the icon.

**Chips:**
Small, rounded labels used for "Paid," "Driver," or "Waitlist" status. These should use light-tinted backgrounds (secondary sage or tertiary terracotta) to keep the primary teal reserved for the main call-to-action.

**Input Fields:**
Minimalist boxes with standard 0.5rem roundedness. Labels always remain visible (floating or top-aligned) to ensure users don't lose context while typing on a small screen.
