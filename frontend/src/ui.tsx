import { useEffect, type ReactNode } from 'react';
import { ApiError } from './lib/api';

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1.6 19.1 12.2 30.4 16 19.1 19.8 16 30.4 12.9 19.8 1.6 16 12.9 12.2Z"
      />
    </svg>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  if (error instanceof ApiError) {
    const bucket = [0, 400, 401, 403, 404, 409, 500].includes(error.status) ? error.status : 500;
    return (
      <div className={`note note-${bucket}`} role="alert">
        <span className="note-code">{error.status || 'rede'}</span>
        <p>{error.message}</p>
      </div>
    );
  }
  return (
    <div className="note note-500" role="alert">
      <span className="note-code">erro</span>
      <p>{error instanceof Error ? error.message : 'Algo quebrou nesta tela.'}</p>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function StateFlow() {
  return (
    <div className="flow" aria-label="Fluxo de estados da tarefa">
      <span>A fazer</span>
      <i>⇄</i>
      <span>Em andamento</span>
      <i>→</i>
      <span className="flow-wait">Aguardando</span>
      <i>→</i>
      <span className="flow-done">Concluída</span>
    </div>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <Mark size={18} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
