// ---------------------------------------------------------------------------
// Zenithsui Multimedia Canvas System — Frame Security & X-Frame Restriction Analyzer
// ---------------------------------------------------------------------------

export interface FrameRestrictionInfo {
  isRestricted: boolean
  siteName: string
  reason: string
  helpTip?: string
  accentGradient?: string
  brandColor?: string
}

/**
 * Known domains that reject direct iframe embedding via X-Frame-Options: DENY/SAMEORIGIN
 * or strict Content-Security-Policy frame-ancestors policies.
 */
const KNOWN_RESTRICTED_DOMAINS: Array<{
  pattern: RegExp
  siteName: string
  reason: string
  helpTip?: string
  accentGradient?: string
  brandColor?: string
  allowSubpath?: RegExp // Exception if subpath is embeddable (e.g. /embed)
}> = [
  {
    pattern: /(?:^|\.)instagram\.com$/i,
    siteName: "Instagram",
    reason: "Meta security headers (X-Frame-Options: DENY) block embedding full web pages.",
    helpTip: "Individual posts or reels (instagram.com/p/... or /reel/...) can be embedded directly.",
    accentGradient: "from-[#833ab4]/15 via-[#fd1d1d]/15 to-[#fcb045]/15",
    brandColor: "#E1306C",
    allowSubpath: /\/(?:p|reel|tv)\/[a-zA-Z0-9_-]+\/embed\/?/i,
  },
  {
    pattern: /(?:^|\.)(?:twitter|x)\.com$/i,
    siteName: "X (formerly Twitter)",
    reason: "X prohibits framing website feeds and profiles directly.",
    helpTip: "Use individual post URLs to embed standalone tweet cards.",
    accentGradient: "from-neutral-500/10 to-neutral-700/10",
    brandColor: "#000000",
  },
  {
    pattern: /(?:^|\.)facebook\.com$/i,
    siteName: "Facebook",
    reason: "Facebook blocks external frame embedding for user account security.",
    helpTip: "Visit the post or profile directly in a browser window.",
    accentGradient: "from-blue-600/15 to-blue-800/15",
    brandColor: "#1877F2",
  },
  {
    pattern: /(?:^|\.)github\.com$/i,
    siteName: "GitHub",
    reason: "GitHub sets X-Frame-Options: DENY on all repositories and web views.",
    helpTip: "Open the repository in a new tab or inspect markdown files directly.",
    accentGradient: "from-stone-500/10 to-stone-700/10",
    brandColor: "#24292F",
  },
  {
    pattern: /(?:^|\.)reddit\.com$/i,
    siteName: "Reddit",
    reason: "Reddit restricts embedding main feeds and community pages.",
    helpTip: "Open Reddit in a dedicated browser tab.",
    accentGradient: "from-orange-500/15 to-red-500/15",
    brandColor: "#FF4500",
  },
  {
    pattern: /(?:^|\.)linkedin\.com$/i,
    siteName: "LinkedIn",
    reason: "LinkedIn disallows iframe embedding across all public surfaces.",
    helpTip: "Open profiles and articles in a new browser window.",
    accentGradient: "from-blue-600/15 to-cyan-700/15",
    brandColor: "#0A66C2",
  },
  {
    pattern: /(?:^|\.)google\.(?:com|[a-z]{2,3})$/i,
    siteName: "Google",
    reason: "Google sets X-Frame-Options: SAMEORIGIN on search results and account pages.",
    helpTip: "Open Google in a new browser tab.",
    accentGradient: "from-blue-500/10 via-red-500/10 to-yellow-500/10",
    brandColor: "#4285F4",
  },
  {
    pattern: /(?:^|\.)tiktok\.com$/i,
    siteName: "TikTok",
    reason: "TikTok homepage and profile views cannot be framed.",
    helpTip: "Direct video links can be embedded via TikTok player URLs.",
    accentGradient: "from-cyan-500/15 to-pink-500/15",
    brandColor: "#FE2C55",
    allowSubpath: /\/embed\//i,
  },
  {
    pattern: /(?:^|\.)notion\.so$/i,
    siteName: "Notion",
    reason: "Notion restricts embedding internal workspace pages without published links.",
    helpTip: "Ensure the page is publicly shared with web access enabled.",
    accentGradient: "from-neutral-500/10 to-neutral-700/10",
    brandColor: "#000000",
  },
  {
    pattern: /(?:^|\.)medium\.com$/i,
    siteName: "Medium",
    reason: "Medium blocks iframe embedding on publication articles.",
    helpTip: "Open the article directly in a new tab.",
    accentGradient: "from-neutral-500/10 to-neutral-700/10",
    brandColor: "#000000",
  },
]

/**
 * Checks whether a URL is from a known frame-restricted domain.
 */
export function checkFrameRestriction(rawUrl: string): FrameRestrictionInfo {
  try {
    const url = new URL(rawUrl.trim())
    const host = url.hostname.toLowerCase()

    for (const item of KNOWN_RESTRICTED_DOMAINS) {
      if (item.pattern.test(host)) {
        if (item.allowSubpath && item.allowSubpath.test(url.pathname)) {
          return { isRestricted: false, siteName: item.siteName, reason: "" }
        }
        return {
          isRestricted: true,
          siteName: item.siteName,
          reason: item.reason,
          helpTip: item.helpTip,
          accentGradient: item.accentGradient,
          brandColor: item.brandColor,
        }
      }
    }

    return {
      isRestricted: false,
      siteName: host.replace(/^www\./, ""),
      reason: "",
    }
  } catch {
    return {
      isRestricted: false,
      siteName: "Web Link",
      reason: "",
    }
  }
}
