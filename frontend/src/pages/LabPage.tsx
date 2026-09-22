import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, request } from '../lib/api';
import { useAuth } from '../lib/auth';
import { StateFlow } from '../ui';

type Result = {
  status: number;
  match: boolean;
  detail: string;
  body: unknown;
};

export function LabPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<Record<string, Result>>({});
  const [foreignProjectId, setForeignProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, expected: number[], exec: () => Promise<{ status: number; body: unknown }>, note?: string) {
    setBusy(id);
    try {
      const response = await exec();
      setResults((current) => ({
        ...current,
        [id]: {
          status: response.status,
          match: expected.includes(response.status),
          detail: note ?? '',
          body: response.body,
        },
      }));
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      setResults((current) => ({
        ...current,
        [id]: {
          status,
          match: expected.includes(status),
          detail: error instanceof Error ? error.message : 'Falhou',
          body: error instanceof ApiError ? error.body : null,
        },
      }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <header className="page-head">
        <p className="kicker">Avaliação</p>
        <h1 className="page-title">Laboratório</h1>
        <p className="lead">
          Os dez cenários obrigatórios. O status pintado de verde bate com o esperado. Vermelho é pista: a regra ainda
          não está no service, ou o endpoint ainda não existe.
        </p>
      </header>

      <ol className="lab-list">
        <li className="scenario">
          <header>
            <span>01</span>
            <div>
              <h2>Fluxo principal</h2>
              <p>Cadastro, promoção, projeto, membro, tarefa, comentário, anexo, aprovação.</p>
            </div>
          </header>
          <ol className="check">
            <li>Crie uma conta membro e outra que você vai promover.</li>
            <li>Como admin, em Pessoas, promova alguém a gestor. A pessoa entra de novo.</li>
            <li>O gestor cria o projeto e adiciona o membro.</li>
            <li>O membro leva a tarefa até Aguardando.</li>
            <li>O gestor aprova. O histórico registra os passos.</li>
          </ol>
          <Link className="btn" to="/">
            Ir para projetos
          </Link>
        </li>

        <Scenario
          index="02"
          title="Body inválido → 400"
          text="E-mail malformado e senha curta em POST /auth/register."
          result={results.invalid}
          busy={busy === 'invalid'}
          onRun={() =>
            void run('invalid', [400], () =>
              request('/auth/register', {
                method: 'POST',
                auth: false,
                body: { email: 'nao-e-email', password: 'curta' },
              }),
            )
          }
        />

        <Scenario
          index="03"
          title="Token inválido → 401"
          text="GET /auth/me com Bearer falso. Não usa a sua sessão."
          result={results.token}
          busy={busy === 'token'}
          onRun={() =>
            void run('token', [401], () => request('/auth/me', { auth: 'token-invalido' }))
          }
        />

        <Scenario
          index="04"
          title="Autenticado sem permissão → 403"
          text={
            user?.role === 'ADMIN'
              ? 'Você é admin e essa rota é sua. Entre com um membro ou gestor para ver o 403.'
              : 'PATCH no seu próprio papel. Membro e gestor não promovem ninguém, nem a si.'
          }
          result={results.forbidden}
          busy={busy === 'forbidden'}
          disabled={user?.role === 'ADMIN'}
          onRun={() =>
            void run('forbidden', [403], () =>
              request(`/users/${user?.id}/role`, { method: 'PATCH', body: { role: 'ADMIN' } }),
            )
          }
        />

        <Scenario
          index="05"
          title="Recurso inexistente → 404"
          text="GET de um projeto com id que não existe."
          result={results.missing}
          busy={busy === 'missing'}
          onRun={() =>
            void run('missing', [404], () =>
              request('/projects/00000000-0000-0000-0000-000000000000'),
            )
          }
        />

        <li className="scenario">
          <header>
            <span>06</span>
            <div>
              <h2>Conflito de regra → 409</h2>
              <p>E-mail repetido não cria outro usuário. Se vier 500, o banco barrou, mas o service ainda não traduziu para ConflictException.</p>
            </div>
          </header>
          <button
            className="btn"
            type="button"
            disabled={!user || busy === 'conflict'}
            onClick={() =>
              void run(
                'conflict',
                [409],
                () =>
                  request('/auth/register', {
                    method: 'POST',
                    auth: false,
                    body: { email: user?.email, password: 'senha-qualquer-123' },
                  }),
                user ? '' : 'Entre primeiro.',
              )
            }
          >
            {busy === 'conflict' ? 'Disparando…' : 'Registrar meu e-mail de novo'}
          </button>
          <ResultView result={results.conflict} />
          <label className="field">
            <span>Tarefa para tentar um salto inválido até DONE</span>
            <input className="input" value={taskId} onChange={(event) => setTaskId(event.target.value)} spellCheck={false} />
            <small>
              Se a tarefa já estiver aguardando e você for gestor, este botão aprova de verdade. Use uma tarefa em A
              fazer para ver o 409.
            </small>
          </label>
          <button
            className="btn btn-danger"
            type="button"
            disabled={!taskId.trim() || busy === 'jump'}
            onClick={() =>
              void run('jump', [409], () =>
                request(`/tasks/${taskId.trim()}/status`, { method: 'PATCH', body: { status: 'DONE' } }),
              )
            }
          >
            {busy === 'jump' ? 'Disparando…' : 'Forçar DONE'}
          </button>
          <ResultView result={results.jump} />
        </li>

        <li className="scenario">
          <header>
            <span>07</span>
            <div>
              <h2>Recurso de terceiro</h2>
              <p>
                Abra, com um membro, o id de um projeto em que ele não está. 403 admite que existe. 404 esconde. Os
                dois defendem; o README precisa dizer qual você escolheu.
              </p>
            </div>
          </header>
          <label className="field">
            <span>Id do projeto alheio</span>
            <input
              className="input"
              value={foreignProjectId}
              onChange={(event) => setForeignProjectId(event.target.value)}
              spellCheck={false}
            />
          </label>
          <button
            className="btn"
            type="button"
            disabled={!foreignProjectId.trim() || busy === 'foreign'}
            onClick={() =>
              void run('foreign', [403, 404], () => request(`/projects/${foreignProjectId.trim()}`))
            }
          >
            {busy === 'foreign' ? 'Disparando…' : 'Tentar abrir'}
          </button>
          <ResultView result={results.foreign} />
        </li>

        <li className="scenario">
          <header>
            <span>08</span>
            <div>
              <h2>Upload válido e inválido</h2>
              <p>
                No quadro, o anexo usa o campo <code>file</code>. Mande um PDF ou PNG e, de propósito, um .exe. Presença,
                tamanho e tipo são regra do backend.
              </p>
            </div>
          </header>
          <Link className="btn" to="/">
            Abrir um projeto
          </Link>
        </li>

        <Scenario
          index="09"
          title="Integração externa"
          text="Ano corrente deve funcionar. O valor abaixo força um ano que a validação ou o serviço externo deve recusar sem derrubar o processo."
          result={results.holiday}
          busy={busy === 'holiday'}
          onRun={() => void run('holiday', [400, 409, 502, 504], () => request('/holidays', { query: { year: 'ano' } }))}
        />

        <li className="scenario">
          <header>
            <span>10</span>
            <div>
              <h2>Máquina de estados</h2>
              <p>Ninguém vai direto para concluída. Aprovar é só da espera, e só gestor ou admin.</p>
            </div>
          </header>
          <StateFlow />
          <p className="hint">Cancelar sai de A fazer e Em andamento. Da espera, só gestor ou admin cancela.</p>
        </li>
      </ol>
    </section>
  );
}

function Scenario({
  index,
  title,
  text,
  result,
  busy,
  disabled,
  onRun,
}: {
  index: string;
  title: string;
  text: string;
  result?: Result;
  busy: boolean;
  disabled?: boolean;
  onRun: () => void;
}) {
  return (
    <li className="scenario">
      <header>
        <span>{index}</span>
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
      </header>
      <button className="btn" type="button" disabled={disabled || busy} onClick={onRun}>
        {busy ? 'Disparando…' : 'Disparar'}
      </button>
      <ResultView result={result} />
    </li>
  );
}

function ResultView({ result }: { result?: Result }) {
  if (!result) return null;
  return (
    <div className={`result ${result.match ? 'ok' : 'bad'}`}>
      <b>{result.status || 'rede'}</b>
      <span>{result.match ? 'esperado' : 'diferente do esperado'}</span>
      {result.detail ? <p>{result.detail}</p> : null}
      <pre>{typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)}</pre>
    </div>
  );
}
