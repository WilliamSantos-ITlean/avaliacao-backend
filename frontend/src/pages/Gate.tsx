import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ErrorNote, Mark } from '../ui';

function Story() {
  return (
    <section className="gate-story">
      <div>
        <p className="gate-brand">
          <Mark />
          Norte
        </p>
        <h1>Cada tarefa precisa de um estado honesto.</h1>
        <p className="gate-lead">
          Quadro do time para testar a API enquanto você constrói o Nest. Permissão, feriado e
          transição moram no backend — esta tela só mostra a resposta.
        </p>
      </div>
      <ol className="steps">
        <li>
          <span>01</span>Cadastro nasce membro
        </li>
        <li>
          <span>02</span>Admin promove a gestor
        </li>
        <li>
          <span>03</span>Gestor abre o projeto e chama o time
        </li>
        <li>
          <span>04</span>Ninguém conclui sem passar pela aprovação
        </li>
      </ol>
      <p className="gate-foot">Fora da nota · cliente local para Postman, Swagger e o quadro</p>
    </section>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="gate">
      <Story />
      <section className="gate-panel">
        <p className="kicker">Sessão</p>
        <h2>Entrar</h2>
        <form className="stack" onSubmit={onSubmit}>
          <label className="field">
            <span>E-mail</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <ErrorNote error={error} />
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="swap">
          Ainda não tem conta? <Link to="/cadastrar">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await register(email, password);
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="gate">
      <Story />
      <section className="gate-panel">
        <p className="kicker">Conta nova</p>
        <h2>Criar conta</h2>
        <p className="lead">Todo cadastro nasce como membro. Só um admin muda esse papel.</p>
        <form className="stack" onSubmit={onSubmit}>
          <label className="field">
            <span>E-mail</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <small>Mínimo de 8 caracteres. E-mail repetido deve voltar 409.</small>
          </label>
          <ErrorNote error={error} />
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Criando…' : 'Criar e entrar'}
          </button>
        </form>
        <p className="swap">
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
