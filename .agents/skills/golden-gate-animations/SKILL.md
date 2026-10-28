---
name: golden-gate-animations
alias: /golden-gate
description: Full animation system, spring transitions, genie window physics, dock bouncing, and Liquid Glass materials from macOS 27 Golden Gate.
---

# Golden Gate OS 27 Animation System

Adopted from `https://github.com/AashmanShukla3223/Antigravity-and-OpenCode-CLI-Prompts-and-Skills` (Golden Gate OS 27).

## 1. Spring Physics Curves

### Window Genie Minimize / Open Transition
- **Stiffness**: `180`
- **Damping**: `24`
- **Mass**: `1.2`
- **Filter**: `blur(40px) saturate(200%) brightness(1.2)` -> `blur(0px) saturate(100%) brightness(1)`
- **Scale**: `scaleX(0.1) scaleY(0)` -> `scale(1)`
- **CSS Utility**: `.animate-genie-in`, `.animate-genie-out`

### Dynamic Island Morphing
- **Stiffness**: `250`
- **Damping**: `25`
- **Mass**: `0.8`
- **Border Radius**: `9999px` (compact pill) -> `28px` (expanded card)
- **CSS Utility**: `.animate-island-morph`

### Dock Launch Bounce
- **Keyframe**: `dock-launch-bounce`
- **Transform**: `translateY(0)` -> `translateY(-16px)` -> `translateY(0)`
- **Duration**: `0.5s` `ease-out`
- **CSS Utility**: `.animate-dock-bounce`

### Notification Toast Spring Entrance
- **Stiffness**: `300`
- **Damping**: `25`
- **Transform**: `translate(80px, -20px) scale(0.95)` -> `translate(0, 0) scale(1)`
- **CSS Utility**: `.animate-toast-spring`

### Viscous / Liquid Sliders
- **Stiffness**: `400`
- **Damping**: `30`
- **CSS Class**: `.viscous-slider`

## 2. Liquid Glass 2.0 Material Specs

```css
:root {
  --glass-blur: 50px;
  --glass-bg-dark: rgba(0, 0, 0, 0.35);
  --glass-bg-light: rgba(255, 255, 255, 0.21);
}

.glass {
  background-color: var(--glass-bg-light, rgba(255, 255, 255, 0.2));
  backdrop-filter: blur(var(--glass-blur, 50px)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--glass-blur, 50px)) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.glass-dark {
  background-color: var(--glass-bg-dark, rgba(0, 0, 0, 0.4));
  backdrop-filter: blur(var(--glass-blur, 50px)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--glass-blur, 50px)) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  color: white;
}

.mac-shadow {
  box-shadow:
    0 20px 40px -10px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}
```

## 3. Micro-Interaction Animations

- **Silicon Glow**: `.hugeicon-golden-gate:hover` scales to `1.1` with `#007aff` glow.
- **Bell Ring**: `@keyframes bell-ring` rotates `[-12deg, 12deg, -8deg, 8deg, 0deg]` for alerts and alarms.
- **Chaos Mode Glitches**: `@keyframes v-stretch` and `@keyframes h-glitch`.
