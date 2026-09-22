import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  dateInputToIso,
  formatBytes,
  formatDate,
  initials,
  nextMoves,
  PROJECT_LABEL,
  TASK_COLUMNS,
  TASK_LABEL,
  timeAgo,
  toDateInput,
} from '../lib/format';
import {
  parseActivity,
  parseComment,
  parseFile,
  parseMember,
  parseProject,
  parseTask,
  unwrapList,
} from '../lib/parse';
import { useToast } from '../lib/toast';
import type { ActivityItem, Member, Project, Task, TaskComment, TaskFile, TaskStatus } from '../lib/types';
import { Empty, ErrorNote, Modal, StateFlow } from '../ui';

type Tab = 'board' | 'members' | 'activity';

export function BoardPage() {
  const { projectId = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('board');
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [projectError, setProjectError] = useState<unknown>(null);
  const [tasksError, setTasksError] = useState<unknown>(null);
  const [membersError, setMembersError] = useState<unknown>(null);
  const [activityError, setActivityError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saveError, setSaveError] = useState<unknown>(null);

  const loadCore = useCallback(async () => {
    setLoading(true);
    const [projectResult, taskResult, memberResult] = await Promise.allSettled([
      api<unknown>(`/projects/${projectId}`),
      api<unknown>(`/projects/${projectId}/tasks`),
      api<unknown>(`/projects/${projectId}/members`),
    ]);

    if (projectResult.status === 'fulfilled') {
      const parsed = parseProject(projectResult.value);
      setProject(parsed);
      setProjectError(parsed ? null : new Error('GET /projects/:id não trouxe id e name.'));
      if (parsed) {
        setName(parsed.name);
        setDescription(parsed.description ?? '');
      }
    } else {
      setProject(null);
      setProjectError(projectResult.reason);
    }

    if (taskResult.status === 'fulfilled') {
      setTasks(unwrapList(taskResult.value).map(parseTask).filter((item): item is Task => item !== null));
      setTasksError(null);
    } else {
      setTasks([]);
      setTasksError(taskResult.reason);
    }

    if (memberResult.status === 'fulfilled') {
      setMembers(unwrapList(memberResult.value).map(parseMember).filter((item): item is Member => item !== null));
      setMembersError(null);
    } else {
      setMembers([]);
      setMembersError(memberResult.reason);
    }

    setLoading(false);
  }, [projectId]);

  const loadActivities = useCallback(async () => {
    try {
      const payload = await api<unknown>(`/projects/${projectId}/activities`);
      setActivities(unwrapList(payload).map(parseActivity).filter((item): item is ActivityItem => item !== null));
      setActivityError(null);
    } catch (cause) {
      setActivities([]);
      setActivityError(cause);
    }
  }, [projectId]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (tab === 'activity') void loadActivities();
  }, [tab, loadActivities]);

  async function saveProject(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    try {
      await api(`/projects/${projectId}`, {
        method: 'PATCH',
        body: { name: name.trim(), description: description.trim() || null },
      });
      toast('Projeto atualizado.');
      await loadCore();
    } catch (cause) {
      setSaveError(cause);
    }
  }

  async function toggleArchive() {
    if (!project) return;
    setSaveError(null);
    try {
      await api(`/projects/${projectId}`, {
        method: 'PATCH',
        body: { status: project.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' },
      });
      toast(project.status === 'ARCHIVED' ? 'Projeto reativado.' : 'Projeto arquivado.');
      await loadCore();
    } catch (cause) {
      setSaveError(cause);
    }
  }

  const oddTasks = tasks.filter((task) => task.status === null);
  const selected = tasks.find((task) => task.id === selectedId) ?? null;

  return (
    <section>
      <p className="kicker">
        <Link to="/">Projetos</Link>
      </p>
      {loading && !project ? <div className="skeleton skeleton-wide" /> : null}
      <ErrorNote error={projectError} />

      {project ? (
        <>
          <header className="page-head split">
            <div>
              <h1 className="page-title">{project.name}</h1>
              <p className="lead">{project.description || 'Sem descrição.'}</p>
            </div>
            <span className={`stamp stamp-${project.status === 'ARCHIVED' ? 'archived' : 'active'}`}>
              {PROJECT_LABEL[project.status]}
            </span>
          </header>

          {project.status === 'ARCHIVED' ? (
            <p className="banner">
              Projeto arquivado. Criar ou mover tarefa deve responder 409. Os botões seguem ativos para você ver essa
              rejeição.
            </p>
          ) : null}

          <form className="edit-bar" onSubmit={saveProject}>
            <label className="field">
              <span>Nome</span>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className="field grow">
              <span>Descrição</span>
              <input className="input" value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <button className="btn" type="submit">
              Salvar
            </button>
            <button className="btn btn-danger" type="button" onClick={() => void toggleArchive()}>
              {project.status === 'ARCHIVED' ? 'Reativar' : 'Arquivar'}
            </button>
          </form>
          <ErrorNote error={saveError} />

          <div className="tabs" role="tablist">
            {(
              [
                ['board', 'Quadro'],
                ['members', 'Membros'],
                ['activity', 'Histórico'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                className={`tab${tab === id ? ' tab-active' : ''}`}
                type="button"
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'board' ? (
            <>
              <div className="split board-tools">
                <StateFlow />
                <button className="btn btn-primary" type="button" onClick={() => setCreating(true)}>
                  Nova tarefa
                </button>
              </div>
              <ErrorNote error={tasksError} />
              {oddTasks.length > 0 ? (
                <p className="hint">
                  A API devolveu status fora do fluxo: {oddTasks.map((task) => `${task.title} (${task.rawStatus})`).join(', ')}.
                </p>
              ) : null}
              <div className="board">
                {TASK_COLUMNS.map((status) => (
                  <Column
                    key={status}
                    status={status}
                    tasks={tasks.filter((task) => task.status === status)}
                    members={members}
                    onOpen={setSelectedId}
                  />
                ))}
              </div>
            </>
          ) : null}

          {tab === 'members' ? (
            <MembersPanel
              projectId={projectId}
              members={members}
              error={membersError}
              onChanged={loadCore}
            />
          ) : null}

          {tab === 'activity' ? (
            <ActivityPanel items={activities} error={activityError} onReload={() => void loadActivities()} />
          ) : null}
        </>
      ) : null}

      {creating && user ? (
        <CreateTask
          projectId={projectId}
          members={members}
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            toast('Tarefa criada.');
            await loadCore();
          }}
        />
      ) : null}

      {selected && user ? (
        <TaskDrawer
          task={selected}
          members={members}
          role={user.role}
          onClose={() => setSelectedId(null)}
          onChanged={async () => {
            await loadCore();
          }}
        />
      ) : null}
    </section>
  );
}

function Column({
  status,
  tasks,
  members,
  onOpen,
}: {
  status: TaskStatus;
  tasks: Task[];
  members: Member[];
  onOpen: (id: string) => void;
}) {
  return (
    <section className={`column column-${status}`}>
      <header className="column-head">
        <h2>{TASK_LABEL[status]}</h2>
        <span className="column-count">{tasks.length}</span>
      </header>
      <div className="column-list">
        {tasks.map((task) => {
          const email = task.assigneeEmail ?? members.find((member) => member.userId === task.assigneeId)?.email;
          return (
            <button key={task.id} className="task-card" type="button" onClick={() => onOpen(task.id)}>
              <strong className="task-title">{task.title}</strong>
              <div className="task-meta">
                <span className="avatar" title={email ?? 'Sem responsável'}>
                  {initials(email)}
                </span>
                <span>{task.dueDate ? formatDate(task.dueDate) : 'sem prazo'}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CreateTask({
  projectId,
  members,
  onClose,
  onCreated,
}: {
  projectId: string;
  members: Member[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: {
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId: assigneeId || undefined,
          dueDate: due ? dateInputToIso(due) : undefined,
        },
      });
      await onCreated();
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title="Nova tarefa" onClose={onClose}>
      <form className="stack" onSubmit={onSubmit}>
        <label className="field">
          <span>Título</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="field">
          <span>Descrição</span>
          <textarea className="textarea" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="field">
          <span>Responsável</span>
          <select className="input" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            <option value="">Sem responsável</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.email}
              </option>
            ))}
          </select>
          <small>Se escolher alguém, precisa ser membro. Senão a API responde 409.</small>
        </label>
        <label className="field">
          <span>Prazo</span>
          <input className="input" type="date" value={due} onChange={(event) => setDue(event.target.value)} />
          <small>
            Feriado no prazo deve voltar 409. <Link to="/feriados">Ver feriados</Link>
          </small>
        </label>
        <ErrorNote error={error} />
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Criando…' : 'Criar tarefa'}
        </button>
      </form>
    </Modal>
  );
}

function TaskDrawer({
  task,
  members,
  role,
  onClose,
  onChanged,
}: {
  task: Task;
  members: Member[];
  role: NonNullable<ReturnType<typeof useAuth>['user']>['role'];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '');
  const [due, setDue] = useState(toDateInput(task.dueDate));
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [sideError, setSideError] = useState<unknown>(null);
  const moves = task.status ? nextMoves(task.status, role) : [];

  const loadSides = useCallback(async () => {
    const [commentResult, fileResult] = await Promise.allSettled([
      api<unknown>(`/tasks/${task.id}/comments`),
      api<unknown>(`/tasks/${task.id}/attachments`),
    ]);
    if (commentResult.status === 'fulfilled') {
      setComments(unwrapList(commentResult.value).map(parseComment).filter((item): item is TaskComment => item !== null));
    }
    if (fileResult.status === 'fulfilled') {
      setFiles(unwrapList(fileResult.value).map(parseFile).filter((item): item is TaskFile => item !== null));
    }
    const failure = [commentResult, fileResult].find((item) => item.status === 'rejected');
    setSideError(failure && failure.status === 'rejected' ? failure.reason : null);
  }, [task.id]);

  useEffect(() => {
    void loadSides();
  }, [loadSides]);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setAssigneeId(task.assigneeId ?? '');
    setDue(toDateInput(task.dueDate));
  }, [task]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: {
          title: title.trim(),
          description: description.trim() || null,
          assigneeId: assigneeId || null,
          dueDate: due ? dateInputToIso(due) : null,
        },
      });
      toast('Tarefa salva.');
      await onChanged();
    } catch (cause) {
      setError(cause);
    }
  }

  async function move(status: TaskStatus) {
    setError(null);
    try {
      await api(`/tasks/${task.id}/status`, { method: 'PATCH', body: { status } });
      toast(status === 'DONE' ? 'Tarefa aprovada.' : 'Estado atualizado.');
      await onChanged();
    } catch (cause) {
      setError(cause);
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api(`/tasks/${task.id}/comments`, { method: 'POST', body: { body: commentBody.trim() } });
      setCommentBody('');
      toast('Comentário publicado.');
      await loadSides();
    } catch (cause) {
      setError(cause);
    }
  }

  async function upload(file: File | null) {
    if (!file) return;
    setError(null);
    const form = new FormData();
    form.append('file', file);
    try {
      await api(`/tasks/${task.id}/attachments`, { method: 'POST', form });
      toast('Anexo enviado.');
      await loadSides();
    } catch (cause) {
      setError(cause);
    }
  }

  return (
    <div className="drawer-root" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label={task.title}>
        <header className="drawer-head">
          <p className="kicker">{task.status ? TASK_LABEL[task.status] : task.rawStatus || 'sem estado'}</p>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </header>

        <form className="stack" onSubmit={save}>
          <label className="field">
            <span>Título</span>
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="field">
            <span>Descrição</span>
            <textarea className="textarea" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="field">
            <span>Responsável</span>
            <select className="input" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
              <option value="">Sem responsável</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.email}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Prazo</span>
            <input className="input" type="date" value={due} onChange={(event) => setDue(event.target.value)} />
          </label>
          <button className="btn" type="submit">
            Salvar dados
          </button>
        </form>

        <div className="move-row">
          {moves.map((moveItem) => (
            <button
              key={moveItem.status}
              className={`btn${moveItem.status === 'DONE' ? ' btn-good' : ''}${moveItem.status === 'CANCELLED' ? ' btn-danger' : ''}`}
              type="button"
              onClick={() => void move(moveItem.status)}
            >
              {moveItem.label}
            </button>
          ))}
          {task.status === 'WAITING_MANAGER_APPROVE' && moves.length === 0 ? (
            <p className="hint">Aguardando gestor ou admin. Membro não aprova, não reprova e não cancela daqui.</p>
          ) : null}
          {task.status === 'DONE' || task.status === 'CANCELLED' ? (
            <p className="hint">Estado final. A API deve recusar qualquer outro salto com 409.</p>
          ) : null}
        </div>

        <ErrorNote error={error} />

        <section className="drawer-block">
          <h3>Comentários</h3>
          <ul className="comment-list">
            {comments.map((comment) => (
              <li key={comment.id} className="comment">
                <div className="row">
                  <strong>{comment.who}</strong>
                  <span className="muted">{timeAgo(comment.when)}</span>
                </div>
                <p>{comment.body}</p>
              </li>
            ))}
          </ul>
          {comments.length === 0 ? <p className="muted">Nenhum comentário.</p> : null}
          <form className="stack" onSubmit={addComment}>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Escreva um comentário"
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              required
            />
            <button className="btn" type="submit">
              Publicar
            </button>
          </form>
        </section>

        <section className="drawer-block">
          <h3>Anexos</h3>
          <ul className="file-list">
            {files.map((file) => (
              <li key={file.id} className="file-row">
                <strong>{file.filename}</strong>
                <span>
                  {file.mimeType} {formatBytes(file.size)}
                </span>
              </li>
            ))}
          </ul>
          <label className="drop">
            <input
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void upload(file);
                event.target.value = '';
              }}
            />
            <span>Escolher arquivo</span>
            <small>Campo `file`. Tipo inválido ou arquivo grande deve voltar 400.</small>
          </label>
          <ErrorNote error={sideError} />
        </section>
      </aside>
    </div>
  );
}

function MembersPanel({
  projectId,
  members,
  error,
  onChanged,
}: {
  projectId: string;
  members: Member[];
  error: unknown;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [who, setWho] = useState('');
  const [formError, setFormError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    const value = who.trim();
    setPending(true);
    setFormError(null);
    const body = value.includes('@') ? { email: value.toLowerCase() } : { userId: value };
    try {
      await api(`/projects/${projectId}/members`, { method: 'POST', body });
      setWho('');
      toast('Membro adicionado.');
      await onChanged();
    } catch (cause) {
      setFormError(cause);
    } finally {
      setPending(false);
    }
  }

  async function remove(userId: string) {
    setFormError(null);
    try {
      await api(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
      toast('Membro removido.');
      await onChanged();
    } catch (cause) {
      setFormError(cause);
    }
  }

  return (
    <div className="stack">
      <ErrorNote error={error} />
      <form className="edit-bar" onSubmit={add}>
        <label className="field grow">
          <span>E-mail ou id do usuário</span>
          <input
            className="input"
            value={who}
            onChange={(event) => setWho(event.target.value)}
            placeholder="ana@email.com"
            required
          />
          <small>Com @ enviamos email. Sem @ enviamos userId. Repetir a pessoa deve voltar 409.</small>
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Adicionar
        </button>
      </form>
      <ErrorNote error={formError} />
      {members.length === 0 ? (
        <Empty title="Sem membros nesta resposta" text="O criador do projeto também deve aparecer como membro, se essa for a regra do service." />
      ) : (
        <ul className="people-list">
          {members.map((member) => (
            <li key={member.id}>
              <span className="avatar">{initials(member.email)}</span>
              <div>
                <strong>{member.email}</strong>
                <small>{member.userId}</small>
              </div>
              <button className="btn btn-small btn-danger" type="button" onClick={() => void remove(member.userId)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityPanel({
  items,
  error,
  onReload,
}: {
  items: ActivityItem[];
  error: unknown;
  onReload: () => void;
}) {
  return (
    <div className="stack">
      <div className="row">
        <button className="btn" type="button" onClick={onReload}>
          Atualizar histórico
        </button>
      </div>
      <ErrorNote error={error} />
      {items.length === 0 && !error ? (
        <Empty title="Nenhuma atividade" text="Criar projeto, membro, tarefa, comentário, anexo ou mudar estado deve gravar uma linha aqui." />
      ) : null}
      <ol className="timeline">
        {items.map((item) => (
          <li key={item.id}>
            <div className="row">
              <strong>{item.action}</strong>
              <span className="muted">{timeAgo(item.when)}</span>
            </div>
            <p>{item.who}</p>
            {item.metadata ? <pre className="traffic-pre">{JSON.stringify(item.metadata, null, 2)}</pre> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
