import type { SquigDoc, SquigNode } from "../types"
import { LanTransportManager } from "./transport"
import { generatePairingPin, validatePairingPin } from "./identity"
import type { PeerRole, ZenithsuiNetworkMessage } from "./types"

export interface ConnectedStudent {
  peerId: string
  name: string
  joinedAt: number
}

export interface ClassroomLanSession {
  hostPeerId: string
  gatewayId: string
  networkId: string
  pairingPin: string
  activeDocumentId: string
  connectedStudents: Map<string, { peerId: string; name: string; joinedAt: number }>
}

export interface WorksheetSubmission {
  type: "worksheet_submission"
  studentId: string
  assignmentId: string
  documentJson: unknown
  submittedAt?: number
}

export type ClassroomNetworkMessage =
  | ZenithsuiNetworkMessage
  | WorksheetSubmission

export function generateClassroomPairingPin(): string {
  const pin = generatePairingPin()
  return pin.replace(/[^0-9A-Z]/g, "").slice(0, 6)
}

export function validateClassroomPairingPin(pin: string): boolean {
  return validatePairingPin(pin)
}

export function createClassroomLanSession(params: {
  hostPeerId: string
  gatewayId: string
  networkId: string
  activeDocumentId: string
  pairingPin?: string
}): ClassroomLanSession {
  return {
    hostPeerId: params.hostPeerId,
    gatewayId: params.gatewayId,
    networkId: params.networkId,
    pairingPin: params.pairingPin ?? generateClassroomPairingPin(),
    activeDocumentId: params.activeDocumentId,
    connectedStudents: new Map(),
  }
}

class MultiPeerSocketAdapter {
  readyState = typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1
  private readonly getSockets: () => Iterable<WebSocket>

  constructor(getSockets: () => Iterable<WebSocket>) {
    this.getSockets = getSockets
  }

  send(data: string): void {
    for (const ws of this.getSockets()) {
      if (ws && ws.readyState === (typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1)) {
        try {
          ws.send(data)
        } catch {
        }
      }
    }
  }

  close(): void {}
}

export class ClassroomHostTransport {
  public readonly session: ClassroomLanSession
  private readonly studentSockets = new Map<string, WebSocket>()
  private readonly transportManager: LanTransportManager
  private readonly socketAdapter: MultiPeerSocketAdapter
  private bufferedSubmissions: WorksheetSubmission[] = []
  private readonly submissionListeners = new Set<(submission: WorksheetSubmission) => void>()
  private currentSnapshot: { doc: SquigDoc; version: number } | null = null

  constructor(session: ClassroomLanSession, customTransportManager?: LanTransportManager) {
    this.session = session
    this.socketAdapter = new MultiPeerSocketAdapter(() => this.studentSockets.values())
    this.transportManager =
      customTransportManager ?? new LanTransportManager(this.socketAdapter as unknown as WebSocket)
    this.loadBufferedSubmissions()
  }

  public getTransportManager(): LanTransportManager {
    return this.transportManager
  }

  public registerStudentSocket(peerId: string, socket: WebSocket, studentName?: string): void {
    this.studentSockets.set(peerId, socket)
    if (!this.session.connectedStudents.has(peerId)) {
      this.session.connectedStudents.set(peerId, {
        peerId,
        name: studentName || "Student",
        joinedAt: Date.now(),
      })
    }
    if (this.currentSnapshot) {
      this.sendSnapshotToPeer(peerId, this.currentSnapshot.doc, this.currentSnapshot.version)
    }
  }

  public unregisterStudentSocket(peerId: string): void {
    this.studentSockets.delete(peerId)
    this.session.connectedStudents.delete(peerId)
  }

  public getConnectedStudents(): Array<{ peerId: string; name: string; joinedAt: number }> {
    return Array.from(this.session.connectedStudents.values())
  }

  public broadcastSnapshot(doc: SquigDoc, version: number = 1): void {
    this.currentSnapshot = { doc, version }
    const message: ZenithsuiNetworkMessage = {
      type: "doc_snapshot",
      doc,
      version,
    }
    this.broadcastRaw(JSON.stringify(message))
  }

  public sendSnapshotToPeer(peerId: string, doc: SquigDoc, version: number = 1): void {
    const socket = this.studentSockets.get(peerId)
    if (socket && socket.readyState === (typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1)) {
      const message: ZenithsuiNetworkMessage = {
        type: "doc_snapshot",
        doc,
        version,
      }
      try {
        socket.send(JSON.stringify(message))
      } catch {
      }
    }
  }

  public broadcastStrokeAnnotation(
    nodeId: string,
    op: "upsert" | "delete",
    node?: SquigNode,
    order?: string[]
  ): void {
    this.transportManager.broadcastNodeUpdate(
      nodeId,
      op,
      node,
      order,
      this.session.hostPeerId
    )
  }

  public handleIncomingMessage(peerId: string, payload: string | Record<string, unknown>): boolean {
    let msg: Record<string, unknown>
    if (typeof payload === "string") {
      try {
        msg = JSON.parse(payload)
      } catch {
        return false
      }
    } else {
      msg = payload
    }

    if (!msg || typeof msg !== "object") {
      return false
    }

    if (msg.type === "worksheet_submission") {
      const submission: WorksheetSubmission = {
        type: "worksheet_submission",
        studentId: typeof msg.studentId === "string" ? msg.studentId : peerId,
        assignmentId: typeof msg.assignmentId === "string" ? msg.assignmentId : "",
        documentJson: msg.documentJson,
        submittedAt: typeof msg.submittedAt === "number" ? msg.submittedAt : Date.now(),
      }
      this.bufferSubmissionLocally(submission)
      return true
    }

    if (msg.type === "client_hello") {
      if (this.session.pairingPin && msg.pairingPin) {
        const cleanSessionPin = this.session.pairingPin.toUpperCase().replace(/[^0-9A-Z]/g, "")
        const cleanInputPin = String(msg.pairingPin).toUpperCase().replace(/[^0-9A-Z]/g, "")
        if (cleanSessionPin !== cleanInputPin) {
          this.sendRawToPeer(
            peerId,
            JSON.stringify({
              type: "server_hello",
              sessionId: this.session.activeDocumentId,
              accepted: false,
              assignedRole: "viewer" as PeerRole,
              reason: "invalid_pairing_pin",
            })
          )
          return false
        }
      }
      const studentName = typeof msg.peerName === "string" ? msg.peerName : "Student"
      this.session.connectedStudents.set(peerId, {
        peerId,
        name: studentName,
        joinedAt: Date.now(),
      })
      this.sendRawToPeer(
        peerId,
        JSON.stringify({
          type: "server_hello",
          sessionId: this.session.activeDocumentId,
          accepted: true,
          assignedRole: "viewer" as PeerRole,
        })
      )
      if (this.currentSnapshot) {
        this.sendSnapshotToPeer(peerId, this.currentSnapshot.doc, this.currentSnapshot.version)
      }
      return true
    }

    const isValid = LanTransportManager.validateIncomingMessage(msg as ZenithsuiNetworkMessage, "viewer")
    if (!isValid || msg.type === "doc_op") {
      return false
    }

    return true
  }

  public bufferSubmissionLocally(submission: WorksheetSubmission): void {
    const existingIndex = this.bufferedSubmissions.findIndex(
      (s) => s.studentId === submission.studentId && s.assignmentId === submission.assignmentId
    )
    if (existingIndex >= 0) {
      this.bufferedSubmissions[existingIndex] = submission
    } else {
      this.bufferedSubmissions.push(submission)
    }
    this.persistSubmissions()
    for (const listener of this.submissionListeners) {
      try {
        listener(submission)
      } catch {
      }
    }
  }

  public getBufferedSubmissions(assignmentId?: string): WorksheetSubmission[] {
    if (assignmentId) {
      return this.bufferedSubmissions.filter((s) => s.assignmentId === assignmentId)
    }
    return [...this.bufferedSubmissions]
  }

  public getBufferedSubmissionsByStudent(studentId: string): WorksheetSubmission[] {
    return this.bufferedSubmissions.filter((s) => s.studentId === studentId)
  }

  public clearBufferedSubmissions(assignmentId?: string): void {
    if (assignmentId) {
      this.bufferedSubmissions = this.bufferedSubmissions.filter((s) => s.assignmentId !== assignmentId)
    } else {
      this.bufferedSubmissions = []
    }
    this.persistSubmissions()
  }

  public onSubmission(listener: (submission: WorksheetSubmission) => void): () => void {
    this.submissionListeners.add(listener)
    return () => {
      this.submissionListeners.delete(listener)
    }
  }

  private broadcastRaw(data: string): void {
    for (const socket of this.studentSockets.values()) {
      if (socket && socket.readyState === (typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1)) {
        try {
          socket.send(data)
        } catch {
        }
      }
    }
  }

  private sendRawToPeer(peerId: string, data: string): void {
    const socket = this.studentSockets.get(peerId)
    if (socket && socket.readyState === (typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1)) {
      try {
        socket.send(data)
      } catch {
      }
    }
  }

  private getStorageKey(): string {
    return `zenithsui:lan:classroom_submissions:${this.session.activeDocumentId}`
  }

  private persistSubmissions(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return
    }
    try {
      window.localStorage.setItem(this.getStorageKey(), JSON.stringify(this.bufferedSubmissions))
    } catch {
    }
  }

  private loadBufferedSubmissions(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return
    }
    try {
      const raw = window.localStorage.getItem(this.getStorageKey())
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.bufferedSubmissions = parsed
        }
      }
    } catch {
    }
  }
}

export class ClassroomStudentTransport {
  public readonly role: PeerRole = "viewer"
  public readonly studentId: string
  public readonly studentName: string
  private socket: WebSocket | null = null
  private pendingSubmissions: WorksheetSubmission[] = []
  private readonly snapshotListeners = new Set<(snapshot: { doc: SquigDoc; version: number }) => void>()
  private readonly strokeListeners = new Set<(msg: { nodeId: string; op: "upsert" | "delete"; node?: SquigNode; order?: string[] }) => void>()

  constructor(studentId: string, studentName: string, socket: WebSocket | null = null) {
    this.studentId = studentId
    this.studentName = studentName
    this.socket = socket
    this.loadPendingSubmissions()
  }

  public setSocket(socket: WebSocket | null): void {
    this.socket = socket
    if (socket && socket.readyState === (typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1)) {
      this.flushPendingSubmissions()
    }
  }

  public submitWorksheet(assignmentId: string, documentJson: unknown): boolean {
    const payload: WorksheetSubmission = {
      type: "worksheet_submission",
      studentId: this.studentId,
      assignmentId,
      documentJson,
      submittedAt: Date.now(),
    }

    if (this.socket && this.socket.readyState === (typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1)) {
      try {
        this.socket.send(JSON.stringify(payload))
        return true
      } catch {
      }
    }

    this.pendingSubmissions.push(payload)
    this.persistPendingSubmissions()
    return false
  }

  public handleIncomingMessage(raw: string | Record<string, unknown>): boolean {
    let msg: Record<string, unknown>
    if (typeof raw === "string") {
      try {
        msg = JSON.parse(raw)
      } catch {
        return false
      }
    } else {
      msg = raw
    }

    if (!msg || typeof msg !== "object") {
      return false
    }

    if (msg.type === "doc_snapshot" && msg.doc) {
      for (const listener of this.snapshotListeners) {
        try {
          listener({
            doc: msg.doc as SquigDoc,
            version: typeof msg.version === "number" ? msg.version : 1,
          })
        } catch {
        }
      }
      return true
    }

    if (msg.type === "doc_op" && typeof msg.nodeId === "string") {
      for (const listener of this.strokeListeners) {
        try {
          listener({
            nodeId: msg.nodeId,
            op: msg.op === "delete" ? "delete" : "upsert",
            node: msg.node as SquigNode | undefined,
            order: Array.isArray(msg.order) ? msg.order : undefined,
          })
        } catch {
        }
      }
      return true
    }

    return true
  }

  public onSnapshot(listener: (snapshot: { doc: SquigDoc; version: number }) => void): () => void {
    this.snapshotListeners.add(listener)
    return () => {
      this.snapshotListeners.delete(listener)
    }
  }

  public onStrokeAnnotation(
    listener: (msg: { nodeId: string; op: "upsert" | "delete"; node?: SquigNode; order?: string[] }) => void
  ): () => void {
    this.strokeListeners.add(listener)
    return () => {
      this.strokeListeners.delete(listener)
    }
  }

  public sendMutationOp(): boolean {
    return false
  }

  private flushPendingSubmissions(): void {
    if (!this.socket || this.socket.readyState !== (typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1)) {
      return
    }
    const remaining: WorksheetSubmission[] = []
    for (const sub of this.pendingSubmissions) {
      try {
        this.socket.send(JSON.stringify(sub))
      } catch {
        remaining.push(sub)
      }
    }
    this.pendingSubmissions = remaining
    this.persistPendingSubmissions()
  }

  private getPendingStorageKey(): string {
    return `zenithsui:lan:pending_submissions:${this.studentId}`
  }

  private persistPendingSubmissions(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return
    }
    try {
      window.localStorage.setItem(this.getPendingStorageKey(), JSON.stringify(this.pendingSubmissions))
    } catch {
    }
  }

  private loadPendingSubmissions(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return
    }
    try {
      const raw = window.localStorage.getItem(this.getPendingStorageKey())
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.pendingSubmissions = parsed
        }
      }
    } catch {
    }
  }
}

export function sendWorksheetSubmission(
  socket: WebSocket,
  studentId: string,
  assignmentId: string,
  documentJson: unknown
): boolean {
  if (!socket || socket.readyState !== (typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1)) {
    return false
  }
  const payload: WorksheetSubmission = {
    type: "worksheet_submission",
    studentId,
    assignmentId,
    documentJson,
    submittedAt: Date.now(),
  }
  try {
    socket.send(JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}
