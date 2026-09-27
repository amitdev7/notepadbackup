// ---------------------------------------------------------------------------
// Zenith AI — PDF & Document Intelligence
// Formats extracted document text, provides search grounding and citations
// ---------------------------------------------------------------------------

import type { AICitation } from "./types"

export interface DocumentReference {
  documentName: string
  pageNumber: number
  snippet: string
}

export function formatPdfPromptSection(docName: string, pageNum: number, text: string): string {
  return `### PDF CONTEXT: "${docName}" (Page ${pageNum})\n\`\`\`text\n${text.slice(0, 4000)}\n\`\`\``
}

export function extractDocumentCitations(text: string, defaultDocName?: string): AICitation[] {
  const citations: AICitation[] = []
  const pageRegex = /(?:page|p\.)\s*(\d+)/gi
  let match

  while ((match = pageRegex.exec(text)) !== null) {
    const page = parseInt(match[1], 10)
    if (page > 0 && !citations.some((c) => c.pageNumber === page)) {
      citations.push({
        sourceTitle: defaultDocName || "Document Reference",
        pageNumber: page,
      })
    }
  }

  return citations
}
