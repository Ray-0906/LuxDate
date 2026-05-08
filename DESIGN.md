# LuxDate Design System — "Lux Dark"

> All UI components must strictly follow these tokens. No ad-hoc values.

---

## Aesthetic

**Deep OLED luxury** with neon glow accents. Think high-end nightclub app on a jet-black AMOLED display. Glass morphism cards floating over subtle gradient meshes. Every interaction glows.

---

## Color Palette

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `bgPrimary` | `#0A0A0F` | Main screen background |
| `bgSecondary` | `#12121A` | Cards, tab bar, headers |
| `bgTertiary` | `#1A1A28` | Elevated surfaces, modals |
| `overlayDark` | `rgba(10,10,15,0.85)` | Full-screen overlays |

### Accents
| Token | Hex | Usage |
|-------|-----|-------|
| `accentMagenta` | `#FF2D78` | Primary CTA, main brand color, glow effects |
| `accentViolet` | `#8B2FF8` | Secondary accent, gradients |
| `accentCyan` | `#00E5FF` | Info, links, tertiary accents |
| `accentRed` | `#FF3040` | Destructive actions, decline call |
| `accentGreen` | `#2DFF93` | Success, accept call, online indicator |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `textPrimary` | `#FFFFFF` | Headlines, primary content |
| `textSecondary` | `#A0A0B8` | Descriptions, secondary content |
| `textMuted` | `#4A4A6A` | Placeholders, disabled text, captions |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `borderGlass` | `rgba(255,255,255,0.08)` | Glass card borders, dividers |

---

## Typography

| Token | Value | Usage |
|-------|-------|-------|
| `fontDisplay` | `sans-serif-condensed` | Display headings, screen titles |
| `fontBody` | `sans-serif` | Body text, labels, descriptions |
| `fontMono` | `monospace` | Coin amounts, timers, codes |

### Scale
| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `sizeDisplay` | 32pt | 900 | Screen titles |
| `sizeH1` | 24pt | 800 | Section headings |
| `sizeH2` | 18pt | 700 | Card titles, names |
| `sizeBody` | 14pt | 400-600 | Body text |
| `sizeLabel` | 12pt | 600-700 | Labels, badges, captions |
| `sizeMonoLg` | 20pt | 800 | Large coin display |
| `sizeMonoSm` | 13pt | 600 | Small coin/stat values |

### Rules
- Headlines: tight letter-spacing (-0.5px to -1px)
- Body: default letter-spacing
- Labels: uppercase + letter-spacing 1px
- Never use default system font appearance — always specify weight

---

## Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight inner padding |
| `sm` | 8px | Icon gaps, small padding |
| `md` | 16px | Standard padding |
| `lg` | 24px | Section padding |
| `xl` | 32px | Screen horizontal padding |
| `xxl` | 48px | Section vertical spacing |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 10px | Small chips, badges |
| `md` | 16px | Cards, inputs |
| `lg` | 20px | Large cards, modals |
| `xl` | 28px | Profile cards |
| `pill` | 999px | Buttons, pills, avatars |

---

## Shadow System (Glow)

Every accent has a matching glow shadow. Use for CTAs, active states, and highlights.

| Shadow | Color | Opacity | Radius | Elevation |
|--------|-------|---------|--------|-----------|
| `glowMagenta` | `#FF2D78` | 0.6 | 12 | 8 |
| `glowViolet` | `#8B2FF8` | 0.6 | 12 | 8 |
| `glowCyan` | `#00E5FF` | 0.6 | 8 | 5 |
| `glowRed` | `#FF3040` | 0.6 | 12 | 8 |
| `glowGreen` | `#2DFF93` | 0.6 | 10 | 6 |
| `glass` | `#000` | 0.3 | 10 | 5 |

---

## Component Patterns

### Glass Card
```
backgroundColor: rgba(255,255,255,0.04)
borderWidth: 1
borderColor: borderGlass
borderRadius: radius.lg
```

### Glass Input
```
backgroundColor: rgba(255,255,255,0.04)
borderWidth: 1
borderColor: borderGlass
borderRadius: radius.md
padding: 14px vertical, 18px horizontal
color: textPrimary
placeholderTextColor: textMuted
```

### Premium Button
```
backgroundColor: accentMagenta (or accent color)
borderRadius: radius.pill
padding: 16px vertical, 32px horizontal
shadow: glowMagenta (matching accent)
Press animation: scale(0.96) with spring damping 15
```

### Feed Card
```
2-column FlatList grid
Card: borderRadius.xl, overflow hidden
Image: full width, aspect ratio 3:4
Gradient overlay: bottom 40%, transparent → rgba(0,0,0,0.7)
Name: sizeH2, fontWeight 800, white
Age/Location: sizeLabel, textSecondary
```

### Profile Screen (TikTok-style)
```
Top: Large avatar (100px, pill radius)
Stats row: coins (monospace) | points | wealth level
Menu items: glass cards with icon + label + chevron
```

---

## Motion Choreography

### Button Press
- Scale to `0.96` on press-in
- Scale to `1.0` on press-out
- Use `withSpring({ damping: 15 })`

### Screen Entry
- `FadeInDown.duration(600).springify()` for main content
- Staggered delays for list items (50ms per item)
- Zero static loads — everything animates in

### Incoming Call
- Avatar ring: `withRepeat` opacity pulse (0.2 → 0.6)
- Accept button: `withRepeat` scale pulse (1.0 → 1.1)
- Vibration pattern: `[0, 500, 200, 500, 200, 500]`

### Tab Bar
- Active icon: accent color with scale emphasis
- Inactive icon: textMuted
- No animation on tab switch (instant)

---

## Anti-Patterns (NEVER DO)

- ❌ Hardcoded hex values in components
- ❌ System default fonts or font sizes
- ❌ Native alerts (`Alert.alert()`) — use custom modals
- ❌ Default ActivityIndicator — use skeleton loading or custom spinners
- ❌ White backgrounds — everything is dark
- ❌ Sharp corners (radius < 10) on any card or button
- ❌ Static screen loads — always animate entries
- ❌ Generic red/blue/green — use the accent palette
- ❌ Flat buttons without glow shadows
- ❌ `@expo/*` imports in a bare RN project
