import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { patchRememberedRole, readPeople } from '../lib/directory';
import { isRole, ROLE_LABEL } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Role, SessionUser } from '../lib/types';
import { ErrorNote } from '../ui';

const ROLES: Role[] = ['MEMBER', 'PROJECT_MANAGER', 'ADMIN'];

export function PeoplePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [people, setPeople] = useState<SessionUser[]>(() => readPeople());
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<Role>('PROJECT_MANAGER');
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupError, setLookupError] = useState<unknown>(null);

  async function promote(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api(`/users/${userId.trim()}/role`, { method: 'PATCH', body: { role } });
      patchRememberedRole(userId.trim(), role);
      setPeople(readPeople());
      toast('Papel atualizado. Se o JWT guarda a role, a pessoa precisa entrar de novo.');
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  }

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setLookupError(null);
    try {
      const payload = await api<unknown>('/users', { query: { email: lookupEmail.trim().toLowerCase() } });
      const found = findUser(payload);
      if (!found) {
        setLookupError(new Error('A API respondeu, mas sem id, email e role reconhecíveis.'));
        return;
      }
      setUserId(found.id);
      setRole(found.role);
      toast('Usuário encontrado na API.');
    } catch (cause) {
      setLookupError(cause);
    }
  }

  return (
    <section>
      <header className="page-head">
        <p className="kicker">Papéis</p>
        <h1 className="page-title">Pessoas</h1>
        <p className="lead">
          Só o admin promove. O endpoint do MVP é <code>PATCH /users/:id/role</code>. A lista abaixo é deste navegador,
          dos cadastros feitos aqui — a API não é obrigada a ter <code>GET /users</code>.
        </p>
      </header>

      <table className="matrix">
        <thead>
          <tr>
            <th>Capacidade</th>
            <th>Membro</th>
            <th>Gestor</th>
            <th>Admin</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Criar projeto</td>
            <td />
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Ver projetos em que é membro</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Listar todos os projetos</td>
            <td />
            <td />
            <td>✓</td>
          </tr>
          <tr>
            <td>Aprovar ou reprovar tarefa</td>
            <td />
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Promover papel</td>
            <td />
            <td />
            <td>✓</td>
          </tr>
        </tbody>
      </table>

      {user?.role !== 'ADMIN' ? (
        <p className="banner">Você não é admin. Pode disparar mesmo assim: o esperado é 403.</p>
      ) : null}

      <form className="edit-bar" onSubmit={lookup}>
        <label className="field grow">
          <span>Buscar e-mail na API</span>
          <input
            className="input"
            type="email"
            value={lookupEmail}
            onChange={(event) => setLookupEmail(event.target.value)}
            placeholder="opcional — GET /users?email="
            required
          />
          <small>Se der 404, o módulo de listagem ainda não existe. Use o id copiado na barra.</small>
        </label>
        <button className="btn" type="submit">
          Buscar
        </button>
      </form>
      <ErrorNote error={lookupError} />

      <form className="edit-bar" onSubmit={promote}>
        <label className="field grow">
          <span>Id do usuário</span>
          <input className="input" value={userId} onChange={(event) => setUserId(event.target.value)} required spellCheck={false} />
        </label>
        <label className="field">
          <span>Novo papel</span>
          <select className="input" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Salvando…' : 'Atualizar papel'}
        </button>
      </form>
      <ErrorNote error={error} />

      <ul className="people-list">
        {people.map((person) => (
          <li key={person.id}>
            <span className={`role-pill role-${person.role}`}>{ROLE_LABEL[person.role]}</span>
            <div>
              <strong>{person.email}</strong>
              <small>{person.id}</small>
            </div>
            <button
              className="btn btn-small"
              type="button"
              onClick={() => {
                setUserId(person.id);
                setRole(person.role === 'MEMBER' ? 'PROJECT_MANAGER' : person.role);
              }}
            >
              Usar este id
            </button>
          </li>
        ))}
      </ul>
      {people.length === 0 ? <p className="muted">Ninguém foi cadastrado neste navegador ainda.</p> : null}
    </section>
  );
}

function findUser(payload: unknown): SessionUser | null {
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === 'object' ? [payload] : [];
  const nested =
    payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : rows;
  for (const item of nested) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<SessionUser>;
    if (row.id && row.email && isRole(row.role)) return { id: row.id, email: row.email, role: row.role };
  }
  return null;
}
