// ---------------------------------------------------------------------------
// Comprehensive Multimedia System Test Suite
// Verifies URL Parsing, Provider Detection, Security Validation,
// Magic Byte Inspection, Node Serialization, Prim Generation, and Coordinator
// ---------------------------------------------------------------------------

import { parseMediaUrl, getProviderAdapter } from "../lib/media/provider-registry"
import { isSafeMediaUrl, inferMediaCategory, validateMediaMagicBytes } from "../lib/media/media-validation"
import { acquireMediaObjectUrl, releaseMediaObjectUrl } from "../lib/media/media-assets"
import { playbackCoordinator } from "../lib/media/playback-coordinator"
import { validNode, wordsOf } from "../lib/clipboard-payload"
import { nodePrims } from "../lib/sketch/node-prims"
import type { MediaNode, EmbedNode } from "../lib/types"

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`)
    process.exit(1)
  }
  console.log(`  ✓ ${msg}`)
}

console.log("=== ZENITHSUI MULTIMEDIA SYSTEM COMPREHENSIVE TEST SUITE ===")

// 1. URL Security & SSRF Protection
console.log("\n1. Testing URL Security & SSRF Protection...")
assert(isSafeMediaUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "Legitimate YouTube HTTPS is safe")
assert(isSafeMediaUrl("https://player.vimeo.com/video/76979871"), "Legitimate Vimeo HTTPS is safe")
assert(isSafeMediaUrl("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"), "Legitimate Spotify HTTPS is safe")
assert(isSafeMediaUrl("https://soundcloud.com/user/track-name"), "Legitimate SoundCloud HTTPS is safe")
assert(!isSafeMediaUrl("javascript:alert(1)"), "Rejects javascript: scheme")
assert(!isSafeMediaUrl("file:///etc/passwd"), "Rejects file: scheme")
assert(!isSafeMediaUrl("data:text/html,<script>alert(1)</script>"), "Rejects data: text/html scheme")
assert(!isSafeMediaUrl("http://localhost:3000/media.mp4"), "Rejects localhost loopback")
assert(!isSafeMediaUrl("http://127.0.0.1:8080/secret"), "Rejects 127.0.0.1 loopback")
assert(!isSafeMediaUrl("http://169.254.169.254/latest/meta-data"), "Rejects AWS metadata IP")
assert(!isSafeMediaUrl("http://metadata.google.internal/computeMetadata"), "Rejects GCP metadata hostname")
assert(!isSafeMediaUrl("http://192.168.1.1/router"), "Rejects private IPv4 192.168.x.x")
assert(!isSafeMediaUrl("http://10.0.0.5/internal"), "Rejects private IPv4 10.x.x.x")

// 2. YouTube URL Parsing & Normalization
console.log("\n2. Testing YouTube Provider Adapter...")
const ytWatch = parseMediaUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s")
assert(ytWatch !== null && ytWatch.provider === "youtube", "Detects standard YouTube watch URL")
assert(ytWatch?.embedUrl.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"), "Uses privacy-enhanced embed URL")
assert(ytWatch?.embedUrl.includes("start=45"), "Correctly preserves timestamp parameter")
assert(ytWatch?.thumbnailUrl === "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "Extracts official YouTube thumbnail")

const ytShorts = parseMediaUrl("https://youtube.com/shorts/abc123XYZ?feature=share")
assert(ytShorts !== null && ytShorts.provider === "youtube", "Detects YouTube Shorts URL")
assert(ytShorts?.embedUrl.includes("abc123XYZ"), "Extracts Shorts video ID")

const ytShortUrl = parseMediaUrl("https://youtu.be/kJQP7kiw5Fk?t=1m30s")
assert(ytShortUrl !== null && ytShortUrl.provider === "youtube", "Detects youtu.be short URL")
assert(ytShortUrl?.embedUrl.includes("kJQP7kiw5Fk"), "Extracts short URL video ID")
assert(ytShortUrl?.embedUrl.includes("start=90"), "Converts 1m30s into start=90 seconds")

// 3. Vimeo Provider Adapter
console.log("\n3. Testing Vimeo Provider Adapter...")
const vimeoStandard = parseMediaUrl("https://vimeo.com/76979871")
assert(vimeoStandard !== null && vimeoStandard.provider === "vimeo", "Detects Vimeo standard video URL")
assert(vimeoStandard?.embedUrl.includes("player.vimeo.com/video/76979871"), "Constructs official Vimeo embed URL")
assert(vimeoStandard?.embedUrl.includes("dnt=1"), "Enforces Do Not Track (dnt=1) on Vimeo")

const vimeoUnlisted = parseMediaUrl("https://vimeo.com/76979871/h1a2b3c4")
assert(vimeoUnlisted !== null && vimeoUnlisted.embedUrl.includes("&h=h1a2b3c4"), "Preserves unlisted Vimeo hash parameter")

// 4. Spotify Provider Adapter
console.log("\n4. Testing Spotify Provider Adapter...")
const spotifyTrack = parseMediaUrl("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123")
assert(spotifyTrack !== null && spotifyTrack.provider === "spotify", "Detects Spotify track URL")
assert(spotifyTrack?.mediaCategory === "audio", "Classifies Spotify as audio")
assert(spotifyTrack?.embedUrl.includes("open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT"), "Constructs official Spotify embed")

const spotifyPlaylist = parseMediaUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")
assert(spotifyPlaylist !== null && spotifyPlaylist.provider === "spotify", "Detects Spotify playlist URL")
assert(spotifyPlaylist?.aspectRatio !== undefined && spotifyPlaylist.aspectRatio < 1, "Applies vertical playlist aspect ratio")

// 5. SoundCloud Provider Adapter
console.log("\n5. Testing SoundCloud Provider Adapter...")
const scTrack = parseMediaUrl("https://soundcloud.com/artist-name/track-title")
assert(scTrack !== null && scTrack.provider === "soundcloud", "Detects SoundCloud track URL")
assert(scTrack?.mediaCategory === "audio", "Classifies SoundCloud as audio")
assert(scTrack?.embedUrl.includes("w.soundcloud.com/player"), "Constructs official SoundCloud widget URL")

// 6. Direct Video & Audio URLs
console.log("\n6. Testing Direct Video & Audio URLs...")
const directVid = parseMediaUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4")
assert(directVid !== null && directVid.provider === "direct-video", "Detects direct MP4 URL")
assert(directVid?.mediaCategory === "video", "Categorizes as video")

const directAud = parseMediaUrl("https://example.com/audio/podcast_ep42.mp3")
assert(directAud !== null && directAud.provider === "direct-audio", "Detects direct MP3 URL")
assert(directAud?.mediaCategory === "audio", "Categorizes as audio")

// 7. Generic Website Embeds
console.log("\n7. Testing Generic Web Embed...")
const genericSite = parseMediaUrl("https://en.wikipedia.org/wiki/Infinite_canvas")
assert(genericSite !== null && genericSite.provider === "generic", "Detects generic web embed")
assert(genericSite?.title === "en.wikipedia.org", "Uses clean hostname title")

// 8. Binary Magic Byte Validation
console.log("\n8. Testing Binary Magic Byte Validation...")
// Create mock MP4 header (ftyp box)
const mp4Header = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // ....ftyp
  0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00  // mp42....
])
const mp4Blob = new Blob([mp4Header], { type: "video/mp4" })
const mp4Check = await validateMediaMagicBytes(mp4Blob)
assert(mp4Check.valid && mp4Check.kind === "video", "Validates genuine MP4 magic bytes (ftyp)")

// Create mock WAV header (RIFF....WAVE)
const wavHeader = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, // RIFF$...
  0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20  // WAVEfmt 
])
const wavBlob = new Blob([wavHeader], { type: "audio/wav" })
const wavCheck = await validateMediaMagicBytes(wavBlob)
assert(wavCheck.valid && wavCheck.kind === "audio", "Validates genuine WAV magic bytes (RIFF/WAVE)")

// 9. Node Serialization, Clipboard Validation & Search Words
console.log("\n9. Testing MediaNode & EmbedNode Serialization & Validation...")
const sampleMediaNode: MediaNode = {
  id: "med_1234",
  seed: 42,
  type: "media",
  mediaKind: "video",
  source: { kind: "local", assetId: "asset_sha256hash123" },
  name: "Physics_Lecture_Ch3.mp4",
  mimeType: "video/mp4",
  sizeBytes: 15420000,
  duration: 342,
  naturalW: 1920,
  naturalH: 1080,
  controls: true,
  loop: false,
  muted: false,
  playbackRate: 1,
  x: 100,
  y: 200,
  w: 560,
  h: 315,
}

const validatedMedia = validNode(sampleMediaNode)
assert(validatedMedia !== null && validatedMedia.type === "media", "validNode accepts valid MediaNode")
assert((validatedMedia as MediaNode).name === "Physics_Lecture_Ch3.mp4", "Preserves media filename")

const sampleEmbedNode: EmbedNode = {
  id: "emb_5678",
  seed: 99,
  type: "embed",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  title: "Rick Astley - Never Gonna Give You Up",
  provider: "youtube",
  mediaCategory: "video",
  x: 300,
  y: 400,
  w: 560,
  h: 315,
}

const validatedEmbed = validNode(sampleEmbedNode)
assert(validatedEmbed !== null && validatedEmbed.type === "embed", "validNode accepts valid EmbedNode")

const words = wordsOf([sampleMediaNode, sampleEmbedNode])
assert(words.includes("Physics_Lecture_Ch3.mp4"), "wordsOf includes media name for search & clipboard")
assert(words.includes("Rick Astley"), "wordsOf includes embed title for search & clipboard")

// 10. Vector Wireframe Primitives (Export & Minimap Fallback)
console.log("\n10. Testing Sketch Engine Prims for Media & Embed...")
const mediaPrims = nodePrims(sampleMediaNode)
assert(mediaPrims.length >= 5, "Generates vector wireframe prims for video player")
assert(mediaPrims.some((p) => p.t === "text" && (p as any).text.includes("VIDEO PLAYER")), "Generates video header label")

const embedPrims = nodePrims(sampleEmbedNode)
assert(embedPrims.length >= 4, "Generates vector wireframe prims for embed node")
assert(embedPrims.some((p) => p.t === "text" && (p as any).text.includes("YOUTUBE")), "Generates provider badge in wireframe")

// 11. Playback Coordinator
console.log("\n11. Testing Playback Coordinator...")
let pausedNotificationCount = 0
const unsub = playbackCoordinator.subscribe((activeId) => {
  if (activeId !== "player_1") pausedNotificationCount++
})

playbackCoordinator.notifyPlay("player_1")
assert(playbackCoordinator.getActivePlayerId() === "player_1", "Coordinator sets active player")

playbackCoordinator.notifyPlay("player_2")
assert(pausedNotificationCount === 1, "Solo mode notifies previous player to pause")
assert(playbackCoordinator.getActivePlayerId() === "player_2", "Switches active player")

playbackCoordinator.pauseAll()
assert(playbackCoordinator.getActivePlayerId() === null, "pauseAll clears active player")
unsub()

// 12. YouTube Live & Legacy URL Formats
console.log("\n12. Testing YouTube Live & Legacy URL Formats...")
const ytLive = parseMediaUrl("https://www.youtube.com/live/liveStream123?feature=share")
assert(ytLive !== null && ytLive.provider === "youtube", "Detects YouTube /live/ URL")
assert(ytLive?.embedUrl.includes("liveStream123"), "Extracts live stream video ID")

const ytLegacy = parseMediaUrl("https://youtube.com/v/legacyVid456")
assert(ytLegacy !== null && ytLegacy.provider === "youtube", "Detects YouTube legacy /v/ URL")
assert(ytLegacy?.embedUrl.includes("legacyVid456"), "Extracts legacy /v/ video ID")

// 13. Security: Spoofed Extensions and Executable Payload Rejection
console.log("\n13. Testing Spoofed File Rejection...")
// Mock EXE payload with 'MZ' header renamed to .mp4
const exeHeader = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00])
const spoofedExe = new Blob([exeHeader], { type: "video/mp4" })
const exeCheck = await validateMediaMagicBytes(spoofedExe)
assert(!exeCheck.valid, "Strictly rejects Windows EXE payload masquerading as video/mp4")

// Mock Shell Script payload with '#!' header renamed to .mp3
const scriptHeader = new Uint8Array([0x23, 0x21, 0x2f, 0x62, 0x69, 0x6e, 0x2f, 0x73, 0x68])
const spoofedScript = new Blob([scriptHeader], { type: "audio/mpeg" })
const scriptCheck = await validateMediaMagicBytes(spoofedScript)
assert(!scriptCheck.valid, "Strictly rejects shell script payload masquerading as audio/mpeg")

// Mock HTML payload with '<!DOCTYPE' renamed to .mp4
const htmlHeader = new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45])
const spoofedHtml = new Blob([htmlHeader], { type: "video/mp4" })
const htmlCheck = await validateMediaMagicBytes(spoofedHtml)
assert(!htmlCheck.valid, "Strictly rejects HTML document masquerading as video/mp4")

// 14. Security: Unsafe embedUrl in Node Sanitization
console.log("\n14. Testing Unsafe embedUrl Validation...")
const maliciousEmbed: EmbedNode = {
  id: "bad_emb",
  seed: 123,
  type: "embed",
  url: "https://example.com",
  embedUrl: "javascript:alert(document.cookie)",
  title: "Malicious Embed",
  x: 0,
  y: 0,
  w: 300,
  h: 200,
}
const cleanedEmbed = validNode(maliciousEmbed)
assert(cleanedEmbed === null, "Rejects embed node with javascript: embedUrl")

// 15. Object URL Reference Counting
console.log("\n15. Testing Object URL Reference Counting & Lifecycle...")
let mockRevoked = false
const originalRevoke = URL.revokeObjectURL
URL.revokeObjectURL = (url: string) => {
  mockRevoked = true
  originalRevoke(url)
}

const dummyBlob = new Blob(["test-audio-content"], { type: "audio/mpeg" })
const u1 = acquireMediaObjectUrl("test_asset_lifecycle", dummyBlob)
assert(typeof u1 === "string" && u1.startsWith("blob:"), "Creates tracked Object URL")

// Acquire again for duplicate node: should return identical URL and increment count
const u2 = acquireMediaObjectUrl("test_asset_lifecycle", dummyBlob)
assert(u1 === u2, "Reuses tracked Object URL across multiple node instances")

// Release first reference: should NOT revoke yet
mockRevoked = false
releaseMediaObjectUrl("test_asset_lifecycle")
assert(!mockRevoked, "Does not revoke while another instance still holds reference")

// Release second reference: should revoke URL
releaseMediaObjectUrl("test_asset_lifecycle")
assert(mockRevoked, "Revokes Object URL once reference count drops to zero")
URL.revokeObjectURL = originalRevoke

console.log("\n=== ALL 36 COMPREHENSIVE MULTIMEDIA TESTS PASSED! 🎥🎧✨ ===")
