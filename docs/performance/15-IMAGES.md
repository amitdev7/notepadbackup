# ZENITHSUI — IMAGE & ASSET PERFORMANCE PIPELINE
## 15-IMAGES.md

> **Target Standard:** Asynchronous Image Decoding, Blob Lifecycle Cleanup, Zero Layout Shifts  
> **Status:** Hardened & Verified

---

## 1. Asynchronous Decoding & Native Lazy Loading

All raster images placed on the canvas or within document previews specify:
```html
<img
  loading="lazy"
  decoding="async"
  src={assetUrl}
  alt={node.label || "Canvas Asset"}
/>
```
- **`decoding="async"`:** Prevents high-resolution JPEG/PNG decoding from pausing the main JavaScript thread during canvas interaction.
- **Aspect Ratio Pre-Calculation:** Every image node retains explicit `(w, h)` dimensions stored in its data record, preventing Cumulative Layout Shift (CLS) when images finish loading.

---

## 2. Object URL Lifecycle Management

Generating `URL.createObjectURL(blob)` without explicit revocation causes persistent memory leaks in long sessions.
- In Zenithsui, object URLs are tracked in an internal weak cache registry.
- When an image node is removed or replaced, `URL.revokeObjectURL(url)` is invoked immediately, releasing the browser's internal image memory backing buffer back to the operating system.
