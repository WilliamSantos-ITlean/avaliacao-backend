import { isRole, isTaskStatus } from './format';
import type { ActivityItem, Holiday, Member, Project, ProjectStatus, Task, TaskComment, TaskFile } from './types';

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['data', 'items', 'results']) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

export function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data;
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as T;
  }
  return payload as T;
}

export function parseProject(payload: unknown): Project | null {
  const row = unwrapEntity<Record<string, unknown>>(payload);
  if (!row || typeof row !== 'object') return null;
  const id = text(row.id);
  const name = text(row.name);
  if (!id || !name) return null;
  const status: ProjectStatus = row.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';
  return {
    id,
    name,
    description: typeof row.description === 'string' ? row.description : null,
    status,
    ownerId: text(row.ownerId),
    createdAt: text(row.createdAt),
    deletedAt: text(row.deletedAt) ?? null,
  };
}

export function parseMember(raw: unknown): Member | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const user = row.user && typeof row.user === 'object' ? (row.user as Record<string, unknown>) : undefined;
  const email = text(row.email) ?? text(user?.email);
  const userId = text(row.userId) ?? text(user?.id) ?? (email ? text(row.id) : undefined);
  if (!userId) return null;
  const nestedRole = user?.role;
  const role = isRole(row.role) ? row.role : isRole(nestedRole) ? nestedRole : undefined;
  return {
    id: text(row.id) ?? userId,
    userId,
    email: email ?? 'sem e-mail',
    role,
    createdAt: text(row.createdAt),
  };
}

export function parseTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const title = text(row.title);
  if (!id || !title) return null;
  const assignee =
    row.assignee && typeof row.assignee === 'object' ? (row.assignee as Record<string, unknown>) : undefined;
  return {
    id,
    projectId: text(row.projectId),
    title,
    description: typeof row.description === 'string' ? row.description : null,
    status: isTaskStatus(row.status) ? row.status : null,
    rawStatus: typeof row.status === 'string' ? row.status : undefined,
    assigneeId: text(row.assigneeId) ?? text(assignee?.id) ?? null,
    assigneeEmail: text(assignee?.email),
    dueDate: text(row.dueDate) ?? null,
  };
}

export function parseComment(raw: unknown): TaskComment | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const body = text(row.body) ?? text(row.content) ?? text(row.text);
  if (!id || !body) return null;
  const author = row.author && typeof row.author === 'object' ? (row.author as Record<string, unknown>) : undefined;
  return {
    id,
    body,
    when: text(row.createdAt),
    who: text(author?.email) ?? text(row.authorEmail) ?? text(row.authorId) ?? 'alguém',
    authorId: text(row.authorId) ?? text(author?.id),
  };
}

export function parseFile(raw: unknown): TaskFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const filename = text(row.filename) ?? text(row.originalName) ?? text(row.name);
  if (!id || !filename) return null;
  const uploadedBy =
    row.uploadedBy && typeof row.uploadedBy === 'object' ? (row.uploadedBy as Record<string, unknown>) : undefined;
  return {
    id,
    filename,
    mimeType: text(row.mimeType) ?? text(row.mimetype),
    size: typeof row.size === 'number' ? row.size : undefined,
    createdAt: text(row.createdAt),
    uploadedById: text(row.uploadedById) ?? text(uploadedBy?.id),
  };
}

export function parseActivity(raw: unknown): ActivityItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id) ?? crypto.randomUUID();
  const action = text(row.action) ?? text(row.type) ?? 'atividade';
  const actor = row.actor && typeof row.actor === 'object' ? (row.actor as Record<string, unknown>) : undefined;
  return {
    id,
    action,
    when: text(row.createdAt),
    who: text(actor?.email) ?? text(row.actorEmail) ?? text(row.actorId) ?? 'alguém',
    metadata: row.metadata,
  };
}

export function parseHolidays(payload: unknown): Holiday[] {
  return unwrapList<unknown>(payload)
    .map((item) => {
      if (typeof item === 'string') return { date: item, name: 'Feriado' };
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const date = text(row.date) ?? text(row.data) ?? text(row.dia);
      if (!date) return null;
      const name = text(row.name) ?? text(row.localName) ?? text(row.nome) ?? text(row.title) ?? 'Feriado';
      return { date, name };
    })
    .filter((item): item is Holiday => item !== null);
}
