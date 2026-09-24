import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, PROJECT_LABEL } from '../lib/format';
import { parseProject, unwrapList } from '../lib/parse';
import { useToast } from '../lib/toast';
import type { Project } from '../lib/types';
import { Empty, ErrorNote, Modal } from '../ui';

export function ProjectsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [deleted, setDeleted] = useState<Project[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [deletedError, setDeletedError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);

  const isAdmin = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api<unknown>('/projects');
      setProjects(unwrapList(payload).map(parseProject).filter((item): item is Project => item !== null));
    } catch (cause) {
      setProjects([]);
      setError(cause);
    }

    if (isAdmin) {
      try {
        const payload = await api<unknown>('/projects/deleted');
        setDeleted(unwrapList(payload).map(parseProject).filter((item): item is Project => item !== null));
        setDeletedError(null);
      } catch (cause) {
        setDeleted([]);
        setDeletedError(cause);
      }
    } else {
      setDeleted([]);
      setDeletedError(null);
    }

    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    try {
      await api('/projects', {
        method: 'POST',
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });
      setCreating(false);
      setName('');
      setDescription('');
      toast('Projeto criado.');
      await load();
    } catch (cause) {
      setFormError(cause);
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <header className="page-head split">
        <div>
          <p className="kicker">Carteira</p>
          <h1 className="page-title">Projetos</h1>
          <p className="lead">
            {isAdmin
              ? 'Admin vê todos. Os demais veem só onde são membros. Membro que cria projeto deve receber 403.'
              : 'Você vê os projetos de que participa.'}
          </p>
        </div>
        <div className="row">
          <button className="btn" type="button" onClick={() => void load()}>
            Atualizar
          </button>
          <button className="btn btn-primary" type="button" onClick={() => setCreating(true)}>
            Novo projeto
          </button>
        </div>
      </header>

      <div className="stage">
        <ErrorNote error={error} />

        {loading ? (
          <div className="card-grid" aria-hidden="true">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : null}

        {!loading && !error && projects.length === 0 ? (
          <Empty
            title="Nenhum projeto ainda"
            text={
              isAdmin
                ? 'Quando POST /projects responder, os cartões aparecem aqui. Gestor e admin criam; membro acompanha os que entrar.'
                : 'Gestor e admin criam projeto. Você acompanha os que entrar.'
            }
          />
        ) : null}

        {!loading && error && isAdmin ? (
          <p className="hint">
            O módulo ainda não respondeu. Assim que <code>GET /projects</code> existir, os cartões entram neste quadro.
          </p>
        ) : null}

        <div className="card-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {isAdmin ? (
          <>
            <h2 className="section-title">Apagados</h2>
            <p className="hint">Só o admin lista estes projetos. O apagamento é lógico: a linha continua no banco.</p>
            <ErrorNote error={deletedError} />
            {!loading && !deletedError && deleted.length === 0 ? (
              <p className="muted">Nenhum projeto apagado.</p>
            ) : null}
            <div className="card-grid">
              {deleted.map((project) => (
                <ProjectCard key={project.id} project={project} deleted />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {creating ? (
        <Modal title="Novo projeto" onClose={() => setCreating(false)}>
          <form className="stack" onSubmit={onCreate}>
            <label className="field">
              <span>Nome</span>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea
                className="textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </label>
            <ErrorNote error={formError} />
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? 'Criando…' : 'Criar projeto'}
            </button>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

function ProjectCard({ project, deleted = false }: { project: Project; deleted?: boolean }) {
  return (
    <Link className="project-card" to={`/projetos/${project.id}`}>
      <div className="split">
        <span className={`stamp${deleted ? ' stamp-deleted' : project.status === 'ARCHIVED' ? ' stamp-archived' : ''}`}>
          {deleted ? 'Apagado' : PROJECT_LABEL[project.status]}
        </span>
        <span className="muted">{formatDate(deleted ? project.deletedAt ?? undefined : project.createdAt)}</span>
      </div>
      <h2>{project.name}</h2>
      <p>{project.description || 'Sem descrição.'}</p>
    </Link>
  );
}
