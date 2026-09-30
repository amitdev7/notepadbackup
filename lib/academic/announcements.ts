export type AnnouncementPriority = 'low' | 'normal' | 'urgent';

export interface Announcement {
  id: string;
  classroomId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  isPinned: boolean;
  createdBy: string;
  publishedAt: string;
  readBy: string[];
}

export interface CreateAnnouncementInput {
  id?: string;
  classroomId: string;
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  isPinned?: boolean;
  createdBy: string;
  publishedAt?: string;
}

export type ClassroomEventType =
  | 'announcement:published'
  | 'assignment:published'
  | 'assignment:submitted'
  | 'quiz:published';

export interface ClassroomBroadcastEvent<T = unknown> {
  id: string;
  topic: string;
  classroomId: string;
  eventType: ClassroomEventType;
  payload: T;
  timestamp: string;
}

const inMemoryAnnouncements: Announcement[] = [];
const inMemoryReadReceipts: Set<string> = new Set();
const inMemoryBroadcastHistory: ClassroomBroadcastEvent[] = [];
const localEventListeners: Set<(event: ClassroomBroadcastEvent<any>) => void> = new Set();

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

export function getClassroomChannelTopic(classroomId: string): string {
  return `classroom:${classroomId}`;
}

export function createAnnouncement(input: CreateAnnouncementInput): Announcement;
export function createAnnouncement(
  classroomId: string,
  title: string,
  content: string,
  priority?: AnnouncementPriority,
  isPinned?: boolean,
  createdBy?: string
): Announcement;
export function createAnnouncement(
  inputOrClassroomId: CreateAnnouncementInput | string,
  title?: string,
  content?: string,
  priority?: AnnouncementPriority,
  isPinned?: boolean,
  createdBy?: string
): Announcement {
  let announcement: Announcement;

  if (typeof inputOrClassroomId === 'object' && inputOrClassroomId !== null) {
    const input = inputOrClassroomId;
    announcement = {
      id: input.id || generateId(),
      classroomId: input.classroomId,
      title: input.title,
      content: input.content,
      priority: input.priority || 'normal',
      isPinned: Boolean(input.isPinned),
      createdBy: input.createdBy,
      publishedAt: input.publishedAt || new Date().toISOString(),
      readBy: [],
    };
  } else {
    announcement = {
      id: generateId(),
      classroomId: inputOrClassroomId,
      title: title || '',
      content: content || '',
      priority: priority || 'normal',
      isPinned: Boolean(isPinned),
      createdBy: createdBy || '',
      publishedAt: new Date().toISOString(),
      readBy: [],
    };
  }

  const existingIndex = inMemoryAnnouncements.findIndex((item) => item.id === announcement.id);
  if (existingIndex >= 0) {
    inMemoryAnnouncements[existingIndex] = announcement;
  } else {
    inMemoryAnnouncements.push(announcement);
  }

  return announcement;
}

export function listAnnouncements(classroomId?: string): Announcement[] {
  const filtered = classroomId
    ? inMemoryAnnouncements.filter((item) => item.classroomId === classroomId)
    : inMemoryAnnouncements;

  return [...filtered].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    const timeA = new Date(a.publishedAt).getTime();
    const timeB = new Date(b.publishedAt).getTime();
    return timeB - timeA;
  });
}

export const getAnnouncements = listAnnouncements;

export function getAnnouncementById(id: string): Announcement | null {
  return inMemoryAnnouncements.find((item) => item.id === id) || null;
}

export function updateAnnouncement(id: string, updates: Partial<Omit<Announcement, 'id'>>): Announcement | null {
  const announcement = inMemoryAnnouncements.find((item) => item.id === id);
  if (!announcement) return null;
  if (updates.title !== undefined) announcement.title = updates.title;
  if (updates.content !== undefined) announcement.content = updates.content;
  if (updates.priority !== undefined) announcement.priority = updates.priority;
  if (updates.isPinned !== undefined) announcement.isPinned = updates.isPinned;
  if (updates.classroomId !== undefined) announcement.classroomId = updates.classroomId;
  if (updates.createdBy !== undefined) announcement.createdBy = updates.createdBy;
  if (updates.publishedAt !== undefined) announcement.publishedAt = updates.publishedAt;
  if (updates.readBy !== undefined) announcement.readBy = updates.readBy;
  return announcement;
}

export function deleteAnnouncement(id: string): boolean {
  const index = inMemoryAnnouncements.findIndex((item) => item.id === id);
  if (index === -1) return false;
  inMemoryAnnouncements.splice(index, 1);
  return true;
}

export function markAnnouncementAsRead(announcementId: string, userId: string): void {
  if (!announcementId || !userId) return;
  const key = `${announcementId}:${userId}`;
  inMemoryReadReceipts.add(key);

  const announcement = inMemoryAnnouncements.find((item) => item.id === announcementId);
  if (announcement) {
    if (!announcement.readBy) {
      announcement.readBy = [];
    }
    if (!announcement.readBy.includes(userId)) {
      announcement.readBy.push(userId);
    }
  }
}

export function isAnnouncementRead(announcementId: string, userId: string): boolean {
  if (!announcementId || !userId) return false;
  if (inMemoryReadReceipts.has(`${announcementId}:${userId}`)) {
    return true;
  }
  const announcement = inMemoryAnnouncements.find((item) => item.id === announcementId);
  return Boolean(announcement && announcement.readBy && announcement.readBy.includes(userId));
}

export function getUnreadAnnouncementCount(classroomId: string, userId: string): number {
  if (!classroomId || !userId) return 0;
  return inMemoryAnnouncements
    .filter((item) => item.classroomId === classroomId)
    .filter((item) => !isAnnouncementRead(item.id, userId)).length;
}

export async function broadcastClassroomEvent(
  supabaseClient: any,
  classroomId: string,
  eventType: ClassroomEventType,
  payload: any
): Promise<void> {
  const topic = getClassroomChannelTopic(classroomId);
  const eventRecord: ClassroomBroadcastEvent = {
    id: generateId(),
    topic,
    classroomId,
    eventType,
    payload,
    timestamp: new Date().toISOString(),
  };

  inMemoryBroadcastHistory.push(eventRecord);

  for (const listener of localEventListeners) {
    try {
      listener(eventRecord);
    } catch {}
  }

  if (!supabaseClient || typeof supabaseClient.channel !== 'function') {
    return;
  }

  try {
    const channel = supabaseClient.channel(topic);
    if (!channel) return;

    if (typeof channel.send === 'function') {
      try {
        const res = await channel.send({
          type: 'broadcast',
          event: eventType,
          payload,
        });
        if (res === 'ok' || res === undefined || res === null || (typeof res === 'object' && !res?.error)) {
          return;
        }
      } catch {}

      if (typeof channel.subscribe === 'function') {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 800);
          try {
            channel.subscribe(async (status: string) => {
              if (status === 'SUBSCRIBED' || status === 'joined') {
                clearTimeout(timer);
                try {
                  await channel.send({
                    type: 'broadcast',
                    event: eventType,
                    payload,
                  });
                } catch {}
                resolve();
              }
            });
          } catch {
            clearTimeout(timer);
            resolve();
          }
        });
      }
    } else if (typeof channel.trigger === 'function') {
      await channel.trigger(eventType, payload);
    }
  } catch {
    return;
  }
}

export function getBroadcastHistory(classroomId?: string): ClassroomBroadcastEvent[] {
  if (classroomId) {
    return inMemoryBroadcastHistory.filter((item) => item.classroomId === classroomId);
  }
  return [...inMemoryBroadcastHistory];
}

export function clearBroadcastHistory(): void {
  inMemoryBroadcastHistory.length = 0;
}

export function clearInMemoryAnnouncements(): void {
  inMemoryAnnouncements.length = 0;
  inMemoryReadReceipts.clear();
}

export function resetAnnouncementStore(): void {
  clearInMemoryAnnouncements();
  clearBroadcastHistory();
}

export function subscribeToClassroomEvents(
  classroomId: string,
  listener: (event: ClassroomBroadcastEvent) => void
): () => void {
  const handler = (event: ClassroomBroadcastEvent) => {
    if (event.classroomId === classroomId) {
      listener(event);
    }
  };
  localEventListeners.add(handler);
  return () => {
    localEventListeners.delete(handler);
  };
}

export function createMockSupabaseRealtimeClient() {
  const channels = new Map<string, any>();
  return {
    channel(topic: string) {
      if (!channels.has(topic)) {
        const listeners: Array<(event: any) => void> = [];
        channels.set(topic, {
          topic,
          state: 'joined',
          send: async (msg: any) => {
            listeners.forEach((fn) => fn(msg));
            return 'ok';
          },
          on: (_type: string, _filter: any, callback: any) => {
            listeners.push(callback);
            return channels.get(topic);
          },
          subscribe: (cb?: (status: string) => void) => {
            if (cb) cb('SUBSCRIBED');
            return channels.get(topic);
          },
          unsubscribe: async () => 'ok',
        });
      }
      return channels.get(topic);
    },
  };
}
