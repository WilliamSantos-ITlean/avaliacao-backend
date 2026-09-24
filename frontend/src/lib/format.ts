import type { ProjectStatus, Role, TaskStatus } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  MEMBER: 'Membro',
  PROJECT_MANAGER: 'Gestor',
  ADMIN: 'Admin',
};

export const TASK_LABEL: Record<TaskStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  WAITING_MANAGER_APPROVE: 'Aguardando',
  DONE: 'Concluída',
  CANCELLED: 'Cancelada',
};

export const PROJECT_LABEL: Record<ProjectStatus, string> = {
  ACTIVE: 'Ativo',
  ARCHIVED: 'Arquivado',
};

export const TASK_COLUMNS: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'WAITING_MANAGER_APPROVE',
  'DONE',
  'CANCELLED',
];

const ROLES: Role[] = ['MEMBER', 'PROJECT_MANAGER', 'ADMIN'];
const TASK_STATUSES: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'WAITING_MANAGER_APPROVE',
  'DONE',
  'CANCELLED',
];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLES.includes(value as Role);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus);
}

export function isManager(role: Role) {
  return role === 'ADMIN' || role === 'PROJECT_MANAGER';
}

export function nextMoves(from: TaskStatus, role: Role): { status: TaskStatus; label: string }[] {
  const manager = isManager(role);
  const all: Record<TaskStatus, { status: TaskStatus; label: string; managerOnly?: boolean }[]> = {
    TODO: [
      { status: 'IN_PROGRESS', label: 'Iniciar' },
      { status: 'CANCELLED', label: 'Cancelar' },
    ],
    IN_PROGRESS: [
      { status: 'TODO', label: 'Voltar' },
      { status: 'WAITING_MANAGER_APPROVE', label: 'Pedir aprovação' },
      { status: 'CANCELLED', label: 'Cancelar' },
    ],
    WAITING_MANAGER_APPROVE: [
      { status: 'DONE', label: 'Aprovar', managerOnly: true },
      { status: 'IN_PROGRESS', label: 'Reprovar', managerOnly: true },
      { status: 'CANCELLED', label: 'Cancelar', managerOnly: true },
    ],
    DONE: [],
    CANCELLED: [],
  };

  return all[from]
    .filter((item) => !item.managerOnly || manager)
    .map(({ status, label }) => ({ status, label }));
}

export function initials(email?: string | null) {
  if (!email) return '·';
  const name = email.split('@')[0] ?? email;
  const parts = name.split(/[.\-_]/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}` : name.slice(0, 2);
  return letters.toUpperCase();
}

export function formatDate(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function timeAgo(iso?: string | null) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  return rtf.format(Math.round(seconds / 86400), 'day');
}

export function toDateInput(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const ACTION_LABEL: Record<string, string> = {
  PROJECT_CREATED: 'Criou o projeto',
  PROJECT_UPDATED: 'Atualizou o projeto',
  PROJECT_ARCHIVED: 'Arquivou o projeto',
  PROJECT_DELETED: 'Apagou o projeto',
  MEMBER_ADDED: 'Adicionou um membro',
  MEMBER_REMOVED: 'Removeu um membro',
  TASK_CREATED: 'Criou uma tarefa',
  TASK_UPDATED: 'Atualizou uma tarefa',
  TASK_STATUS_CHANGED: 'Mudou o estado da tarefa',
  TASK_DELETED: 'Apagou uma tarefa',
  COMMENT_CREATED: 'Publicou um comentário',
  COMMENT_DELETED: 'Apagou um comentário',
  ATTACHMENT_UPLOADED: 'Enviou um anexo',
  ATTACHMENT_DELETED: 'Apagou um anexo',
};

export function activityTitle(action: string) {
  return ACTION_LABEL[action] ?? action.replaceAll('_', ' ').toLowerCase();
}

export function activityDetails(metadata: unknown, emails: Map<string, string>) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const row = metadata as Record<string, unknown>;
  const lines: string[] = [];
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : '');
  const person = (id: unknown) => {
    const raw = text(id);
    if (!raw) return '';
    return emails.get(raw) ?? '';
  };

  const email = text(row.email) || person(row.userId);
  if (email) lines.push(email);

  const name = text(row.name) || text(row.title) || text(row.filename);
  if (name) lines.push(name);

  const description = text(row.description);
  if (description) lines.push(description);

  if ('from' in row || 'to' in row) {
    lines.push(`${statusLabel(row.from)} → ${statusLabel(row.to)}`);
  } else if (text(row.status)) {
    lines.push(statusLabel(row.status));
  }

  if ('assigneeId' in row) {
    if (row.assigneeId === null) lines.push('Sem responsável');
    else lines.push(person(row.assigneeId) ? `Responsável: ${person(row.assigneeId)}` : 'Responsável alterado');
  }

  if ('dueDate' in row) {
    lines.push(row.dueDate ? `Prazo: ${formatDate(text(row.dueDate))}` : 'Prazo removido');
  }

  return lines;
}

function statusLabel(value: unknown) {
  if (typeof value !== 'string') return '—';
  if (isTaskStatus(value)) return TASK_LABEL[value];
  if (value === 'ACTIVE' || value === 'ARCHIVED') return PROJECT_LABEL[value];
  return value;
}

export function dateInputToIso(value: string) {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

export function formatBytes(size?: number) {
  if (size === undefined || Number.isNaN(size)) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function shortId(id?: string) {
  if (!id) return '';
  return id.slice(0, 8);
}
