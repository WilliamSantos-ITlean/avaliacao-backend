import { useEffect, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { ApiError } from './lib/api';
import { useAuth } from './lib/auth';

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
  const { user } = useAuth();
  const showCode = user?.role === 'ADMIN';
  if (!error) return null;
  if (error instanceof ApiError) {
    const bucket = [0, 400, 401, 403, 404, 409, 500].includes(error.status) ? error.status : 500;
    return (
      <div className={`note note-${bucket}${showCode ? '' : ' note-plain'}`} role="alert">
        {showCode ? <span className="note-code">{error.status || 'rede'}</span> : null}
        <p>{error.message}</p>
      </div>
    );
  }
  return (
    <div className={`note note-500${showCode ? '' : ' note-plain'}`} role="alert">
      {showCode ? <span className="note-code">erro</span> : null}
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
    <motion.div
      className="overlay"
      onMouseDown={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
    >
      <motion.div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </header>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function StateFlow() {
  return (
    <div className="flow" aria-label="Fluxo de estados da tarefa">
      <span>A fazer</span>
      <ArrowRight size={14} />
      <span>Em andamento</span>
      <ArrowRight size={14} />
      <span className="flow-wait">Aguardando</span>
      <ArrowRight size={14} />
      <span className="flow-done">Concluída</span>
    </div>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
