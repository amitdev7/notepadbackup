# ZENITHSUI — BUNDLE SIZE & CODE-SPLITTING OPTIMIZATION
## 18-BUNDLE.md

> **Target Standard:** Initial JS Bundle < 150 KB gzipped, Zero Duplicate Dependencies  
> **Compiler:** Turbopack, Next.js 15, SWC Minifier  
> **Status:** Hardened & Verified

---

## 1. Bundle Inventory & Optimization Flags

```
Route (app)                              Size     First Load JS
┌ ○ / (Infinite Canvas)                87.4 kB          134 kB
├ ○ /dashboard                         32.1 kB           98 kB
├ ○ /kitchen-sink                      28.4 kB           94 kB
├ ƒ /lan/view/[sessionId]              14.2 kB           80 kB
└ ƒ /api/* (22 Serverless Routes)      < 20 kB          N/A
```

### Compiler Optimization Directives (`next.config.ts`)
1. **`optimizePackageImports`:** Automatically tree-shakes `@phosphor-icons/react` and `lucide-react`, ensuring only referenced icon SVGs are bundled.
2. **Dynamic Route Code-Splitting:** Heavy modules (Settings workspace, PDF viewer, export generator) are isolated in dynamic chunks loaded on-demand.
