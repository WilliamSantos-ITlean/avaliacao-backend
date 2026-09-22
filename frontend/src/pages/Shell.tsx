import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api, getApiBase, getApiKey, setApiBase, setApiKey } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ROLE_LABEL } from '../lib/format';
import { useToast } from '../lib/toast';
import { useTraffic } from '../lib/traffic';
import { Mark } from '../ui';

const LINKS = [
  { to: '/', label: 'Projetos', end: true },
  { to: '/pessoas', label: 'Pessoas', end: false },
  { to: '/feriados', label: 'Feriados', end: false },
  { to: '/laboratorio', label: 'Laboratório', end: false },
];

export function Shell() {
  const { user, logout, fromJwt, token } = useAuth();
  const toast = useToast();
  const { entries, clear } = useTraffic();
  const [base, setBase] = useState(getApiBase);
  const [apiKey, setApiKeyValue] = useState(getApiKey);
  const [ping, setPing] = useState<'idle' | 'ok' | 'down'>('idle');
  const [openTraffic, setOpenTraffic] = useState(false);

  async function check() {
    try {
      await api<unknown>('/');
      setPing('ok');
    } catch {
      setPing('down');
    }
  }

  useEffect(() => {
    void check();
  }, [base, apiKey]);

  const last = entries[0];
  const hot = last ? last.status === 0 || last.status >= 400 : false;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <p className="brand">
            <Mark />
            <span>
              <strong>Norte</strong>
              <small>gestão de projetos</small>
            </span>
          </p>
          <nav className="nav">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="side-foot">
          <details className="api-box">
            <summary>
              <i className={`ping ping-${ping}`} />
              Conexão
            </summary>
            <label className="field">
              <span>Base da API</span>
              <input
                className="input"
                value={base}
                onChange={(event) => setBase(event.target.value)}
                onBlur={() => setBase(setApiBase(base))}
                spellCheck={false}
              />
              <small>Padrão `/api` usa o proxy do Vite para a porta 3000.</small>
            </label>
            <label className="field">
              <span>x-api-key</span>
              <input
                className="input"
                value={apiKey}
                onChange={(event) => setApiKeyValue(event.target.value)}
                onBlur={() => setApiKeyValue(setApiKey(apiKey))}
                spellCheck={false}
                autoComplete="off"
              />
              <small>Toda rota exige este header. O valor local está em API_KEY no .env.</small>
            </label>
            <button className="btn btn-small" type="button" onClick={() => void check()}>
              Testar
            </button>
          </details>

          {user ? (
            <div className="user-chip">
              <div>
                <strong className="user-mail">{user.email}</strong>
                <span className={`role-pill role-${user.role}`}>{ROLE_LABEL[user.role]}</span>
              </div>
              {fromJwt ? (
                <small>Sessão lida do JWT. Quando `GET /auth/me` devolver o usuário, o perfil passa a vir da API.</small>
              ) : null}
              <div className="row">
                <button
                  className="btn btn-small btn-ghost"
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(user.id);
                    toast('Id copiado.');
                  }}
                >
                  Copiar id
                </button>
                <button
                  className="btn btn-small btn-ghost"
                  type="button"
                  disabled={!token}
                  onClick={() => {
                    if (!token) return;
                    void navigator.clipboard.writeText(token);
                    toast('Token copiado. No Postman, use Authorization Bearer.');
                  }}
                >
                  Copiar token
                </button>
                <button className="btn btn-small btn-ghost" type="button" onClick={logout}>
                  Sair
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="canvas">
        <Outlet />
      </div>

      <button
        className={`traffic-toggle${hot ? ' hot' : ''}`}
        type="button"
        onClick={() => setOpenTraffic((open) => !open)}
      >
        Tráfego
        <span>{entries.length}</span>
      </button>

      {openTraffic ? (
        <section className="traffic-panel" aria-label="Últimas chamadas">
          <header className="row">
            <strong>Últimas chamadas</strong>
            <button className="btn btn-small btn-ghost" type="button" onClick={clear}>
              Limpar
            </button>
            <button className="btn btn-small btn-ghost" type="button" onClick={() => setOpenTraffic(false)}>
              Fechar
            </button>
          </header>
          {entries.length === 0 ? <p className="muted">Ainda não houve request nesta sessão.</p> : null}
          <ul>
            {entries.map((entry) => (
              <li key={entry.id} className={`traffic-row status-${entry.status >= 400 || entry.status === 0 ? 'bad' : 'ok'}`}>
                <div className="row">
                  <b>{entry.method}</b>
                  <code>{entry.path}</code>
                  <em>{entry.status || 'rede'}</em>
                  <span>{entry.ms} ms</span>
                </div>
                {entry.response ? <pre className="traffic-pre">{stringify(entry.response)}</pre> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function stringify(value: unknown) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}
