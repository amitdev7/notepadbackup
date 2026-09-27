import { resolve as resolvePath, dirname } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { existsSync } from "node:fs"

const root = fileURLToPath(new URL("..", import.meta.url))

function withExtension(path) {
  if (existsSync(path)) return path
  if (existsSync(`${path}.ts`)) return `${path}.ts`
  if (existsSync(`${path}.tsx`)) return `${path}.tsx`
  if (existsSync(`${path}.js`)) return `${path}.js`
  if (existsSync(`${path}.mjs`)) return `${path}.mjs`
  if (existsSync(`${path}.json`)) return `${path}.json`
  if (existsSync(`${path}/index.ts`)) return `${path}/index.ts`
  if (existsSync(`${path}/index.tsx`)) return `${path}/index.tsx`
  if (existsSync(`${path}/index.js`)) return `${path}/index.js`
  return path
}

export async function resolve(specifier, context, next) {
  let targetSpecifier = specifier
  if (specifier.startsWith("@/")) {
    targetSpecifier = pathToFileURL(withExtension(resolvePath(root, specifier.slice(2)))).href
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const abs = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier)
    const found = withExtension(abs)
    if (found !== abs || existsSync(abs)) {
      targetSpecifier = pathToFileURL(found).href
    }
  }

  const result = await next(targetSpecifier, context)
  if (result.url.endsWith(".json")) {
    return {
      ...result,
      importAttributes: {
        ...result.importAttributes,
        type: "json",
      },
    }
  }
  return result
}
