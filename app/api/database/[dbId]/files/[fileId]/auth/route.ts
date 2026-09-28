import { NextRequest, NextResponse } from "next/server"
import { getRawDoc, updateDocPassword } from "@/lib/server-documents"
import {
  hashPassword,
  verifyPassword,
  createEditToken,
  verifyEditToken,
  getAttemptStatus,
  recordPasswordAttempt,
} from "@/lib/security"

export const dynamic = "force-dynamic"

function getSessionId(req: NextRequest): string {
  return (
    req.headers.get("x-session-id") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "zenithsui-client-session"
  )
}

/**
 * POST /api/database/[dbId]/files/[fileId]/auth
 * Verify password for a protected document.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const sessionId = getSessionId(req)

  try {
    const body = await req.json()
    const password = body?.password as string | undefined

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const attemptStatus = getAttemptStatus(sessionId, fileId)
    if (attemptStatus.locked) {
      return NextResponse.json(
        {
          error: "Too many failed attempts. Editing is locked for this document.",
          locked: true,
          attemptsLeft: 0,
        },
        { status: 429 }
      )
    }

    const doc = await getRawDoc(dbId, fileId)
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (!doc.passwordHash || !doc.passwordSalt) {
      // Document is not password protected, grant edit token immediately
      const token = createEditToken(dbId, fileId, "editor")
      return NextResponse.json({
        success: true,
        token,
        role: "editor",
        hasPassword: false,
      })
    }

    const isValid = verifyPassword(password, doc.passwordHash, doc.passwordSalt)
    const result = recordPasswordAttempt(sessionId, fileId, isValid)

    if (!isValid) {
      return NextResponse.json(
        {
          error: result.locked
            ? "Incorrect password. 3 failed attempts reached: editing is locked."
            : `Incorrect password. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} remaining.`,
          locked: result.locked,
          attemptsLeft: result.attemptsLeft,
        },
        { status: 401 }
      )
    }

    // Success! Generate signed edit token
    const token = createEditToken(dbId, fileId, "editor")
    return NextResponse.json({
      success: true,
      token,
      role: "editor",
      hasPassword: true,
    })
  } catch (err) {
    console.error("[Auth API] Error verifying password:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/database/[dbId]/files/[fileId]/auth
 * Set or change password for a document.
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params
  const sessionId = getSessionId(req)

  try {
    const body = await req.json()
    const newPassword = body?.newPassword as string | undefined
    const oldPassword = body?.oldPassword as string | undefined
    const token = req.headers.get("x-zenithsui-edit-token") || (body?.token as string | undefined)

    if (!newPassword || newPassword.trim().length < 3) {
      return NextResponse.json(
        { error: "Password must be at least 3 characters long" },
        { status: 400 }
      )
    }

    const doc = await getRawDoc(dbId, fileId)
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // If already has a password, verify authorization
    if (doc.passwordHash && doc.passwordSalt) {
      let authorized = false
      if (token) {
        const check = verifyEditToken(token, dbId, fileId)
        if (check.valid) authorized = true
      }
      if (!authorized && oldPassword) {
        authorized = verifyPassword(oldPassword, doc.passwordHash, doc.passwordSalt)
      }
      if (!authorized) {
        return NextResponse.json(
          { error: "Current password or valid edit token is required to change password." },
          { status: 403 }
        )
      }
    }

    const { hash, salt } = hashPassword(newPassword.trim())
    await updateDocPassword(dbId, fileId, hash, salt, true)

    // Generate new token for the owner
    const newToken = createEditToken(dbId, fileId, "owner")
    recordPasswordAttempt(sessionId, fileId, true)

    return NextResponse.json({
      success: true,
      token: newToken,
      hasPassword: true,
    })
  } catch (err) {
    console.error("[Auth API] Error setting password:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/database/[dbId]/files/[fileId]/auth
 * Remove password protection from a document.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ dbId: string; fileId: string }> }
) {
  const { dbId, fileId } = await context.params

  try {
    const token = req.headers.get("x-zenithsui-edit-token")
    const body = await req.json().catch(() => ({}))
    const password = body?.password as string | undefined

    const doc = await getRawDoc(dbId, fileId)
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    let authorized = false
    if (token) {
      const check = verifyEditToken(token, dbId, fileId)
      if (check.valid) authorized = true
    }
    if (!authorized && password && doc.passwordHash && doc.passwordSalt) {
      authorized = verifyPassword(password, doc.passwordHash, doc.passwordSalt)
    }
    if (!authorized && (!doc.passwordHash || !doc.hasPassword)) {
      authorized = true
    }

    if (!authorized) {
      return NextResponse.json(
        { error: "Valid edit token or password required to remove password protection." },
        { status: 403 }
      )
    }

    await updateDocPassword(dbId, fileId, undefined, undefined, false)

    return NextResponse.json({
      success: true,
      hasPassword: false,
    })
  } catch (err) {
    console.error("[Auth API] Error removing password:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
