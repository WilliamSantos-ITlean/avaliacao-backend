export type Role = 'MEMBER' | 'PROJECT_MANAGER' | 'ADMIN';

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'WAITING_MANAGER_APPROVE'
  | 'DONE'
  | 'CANCELLED';

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId?: string;
  createdAt?: string;
  deletedAt?: string | null;
};

export type Member = {
  id: string;
  userId: string;
  email: string;
  role?: Role;
  createdAt?: string;
};

export type Task = {
  id: string;
  projectId?: string;
  title: string;
  description: string | null;
  status: TaskStatus | null;
  rawStatus?: string;
  assigneeId: string | null;
  assigneeEmail?: string;
  dueDate: string | null;
};

export type TaskComment = {
  id: string;
  body: string;
  when?: string;
  who: string;
  authorId?: string;
};

export type TaskFile = {
  id: string;
  filename: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  uploadedById?: string;
};

export type ActivityItem = {
  id: string;
  action: string;
  when?: string;
  who: string;
  metadata?: unknown;
};

export type Holiday = {
  date: string;
  name: string;
};
