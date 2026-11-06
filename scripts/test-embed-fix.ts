import { parseMediaUrl } from "../lib/media/provider-registry"
import { checkFrameRestriction } from "../lib/media/frame-security"

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`)
    process.exit(1)
  }
}

async function run() {
  console.log("🧪 Testing Embed Fixes for YouTube & Frame-Restricted Sites (Instagram, etc.)...")

  // 1. YouTube video URL parsing
  const yt = parseMediaUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
  assert(yt !== null, "YouTube URL must parse successfully")
  assert(yt?.provider === "youtube", "Provider must be youtube")
  console.log("✅ YouTube provider parsing verified.")

  // 2. Instagram Root URL parsing
  const igRoot = parseMediaUrl("https://instagram.com")
  assert(igRoot !== null, "Instagram root URL must parse")
  assert(igRoot?.provider === "instagram", "Provider must be instagram")
  assert((igRoot?.providerData as any)?.isRestricted === true, "Instagram root must be flagged as restricted")
  console.log("✅ Instagram root site restriction detection verified.")

  // 3. Instagram Post URL parsing (Embeddable)
  const igPost = parseMediaUrl("https://www.instagram.com/p/C-XYZ123/")
  assert(igPost !== null, "Instagram post URL must parse")
  assert(igPost?.provider === "instagram", "Provider must be instagram")
  assert(igPost?.embedUrl.includes("/embed/"), "Instagram post embedUrl must contain /embed/")
  console.log("✅ Instagram post embed URL translation verified.")

  // 4. checkFrameRestriction tests
  const checkIg = checkFrameRestriction("https://instagram.com")
  assert(checkIg.isRestricted === true, "instagram.com must be restricted")
  assert(checkIg.siteName === "Instagram", "siteName must be Instagram")

  const checkGithub = checkFrameRestriction("https://github.com/facebook/react")
  assert(checkGithub.isRestricted === true, "github.com must be restricted")

  const checkX = checkFrameRestriction("https://x.com/cristiano")
  assert(checkX.isRestricted === true, "x.com must be restricted")

  const checkWiki = checkFrameRestriction("https://en.wikipedia.org/wiki/Portal:Contents")
  assert(checkWiki.isRestricted === false, "wikipedia should not be restricted")

  console.log("✅ checkFrameRestriction identified all known X-Frame restricted domains correctly.")

  console.log("\n🎉 ALL EMBED & SECURITY VERIFICATION TESTS PASSED!")
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
