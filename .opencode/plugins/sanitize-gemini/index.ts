import { Plugin } from "@opencode/plugin"

// Gemini (via the 9Router OpenAI-compatible gateway) rejects any
// `$ref: "#/$defs/..."` found inside a function_response with:
//   "The referenced name `#/$defs/Config` in function_response.response
//    does not match to a display_name in the function_response.parts."
// This happens as soon as session history contains a JSON Schema dump
// (e.g. a `webfetch` of https://opencode.ai/config.json, which starts
// with `{"$ref": "#/$defs/Config", "$defs": {...}}`).
// Other providers (muse-spark, claude) tolerate it, Gemini 400s.
//
// This hook rewrites the *outgoing* request only (persisted history is
// untouched): `$ref` -> `ref_`, `$defs` -> `defs_`, in objects and in raw
// JSON strings, so Gemini no longer treats them as file references.
function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    if (!value.includes("$ref") && !value.includes("$defs")) return value
    return value
      .replaceAll('"$ref"', '"ref_"')
      .replaceAll("'$ref'", "'ref_'")
      .replaceAll('"$defs"', '"defs_"')
      .replaceAll("'$defs'", "'defs_'")
      .replaceAll("#/$defs/", "#/defs_/")
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = sanitize(value[i], seen)
    return value
  }
  if (value !== null && typeof value === "object") {
    if (seen.has(value)) return value
    seen.add(value)
    const obj = value as Record<string, unknown>
    for (const key of Object.keys(obj)) {
      if (key === "$ref") {
        obj["ref_"] = sanitize(obj[key], seen)
        delete obj[key]
      } else if (key === "$defs") {
        obj["defs_"] = sanitize(obj[key], seen)
        delete obj[key]
      } else {
        obj[key] = sanitize(obj[key], seen)
      }
    }
    return obj
  }
  return value
}

export default Plugin.define({
  id: "sanitize-gemini",
  async setup(ctx) {
    const scrub = (event: any) => {
      if (event.messages) sanitize(event.messages)
      if (event.tools) sanitize(event.tools)
    }
    // Scoped to 9Router so other providers are unaffected.
    await ctx.session.hook("context", scrub, { providerID: "9router" })
    await ctx.session.hook("compaction", scrub, { providerID: "9router" })
  },
})
