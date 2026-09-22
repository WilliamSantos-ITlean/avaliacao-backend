import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, isManager, PROJECT_LABEL } from '../lib/format';
import { parseProject, unwrapList } from '../lib/parse';
import { useToast } from '../lib/toast';
import type { Project } from '../lib/types';
import { Empty, ErrorNote, Modal } from '../ui';

export function ProjectsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api<unknown>('/projects');
      setProjects(unwrapList(payload).map(parseProject).filter((item): item is Project => item !== null));
    } catch (cause) {
      setProjects([]);
      setError(cause);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const canCreate = user ? isManager(user.role) : false;

  return (
    <section>
      <header className="page-head split">
        <div>
          <p className="kicker">Carteira</p>
          <h1 className="page-title">Projetos</h1>
          <p className="lead">
            Admin vê todos. Os demais veem só onde são membros. Membro que cria projeto deve receber 403.
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

      {!canCreate ? (
        <p className="hint">Você é membro. O botão continua aqui de propósito: o 403 é um teste, não um bloqueio da tela.</p>
      ) : null}

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
            text="Quando POST /projects responder, os cartões aparecem aqui. Gestor e admin criam; membro acompanha os que entrar."
          />
        ) : null}

        {!loading && error ? (
          <p className="hint">
            O módulo ainda não respondeu. Assim que <code>GET /projects</code> existir, os cartões entram neste quadro.
          </p>
        ) : null}

        <div className="card-grid">
          {projects.map((project) => (
            <Link key={project.id} className="project-card" to={`/projetos/${project.id}`}>
              <div className="split">
                <span className={`stamp stamp-${project.status === 'ARCHIVED' ? 'archived' : 'active'}`}>
                  {PROJECT_LABEL[project.status]}
                </span>
                <span className="muted">{formatDate(project.createdAt)}</span>
              </div>
              <h2>{project.name}</h2>
              <p>{project.description || 'Sem descrição.'}</p>
            </Link>
          ))}
        </div>
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
