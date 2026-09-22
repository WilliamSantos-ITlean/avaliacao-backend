import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { parseHolidays } from '../lib/parse';
import type { Holiday } from '../lib/types';
import { Empty, ErrorNote } from '../ui';

export function HolidaysPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setPending(true);
    setError(null);
    try {
      const payload = await api<unknown>('/holidays', { query: { year } });
      setHolidays(parseHolidays(payload));
      setLoaded(true);
    } catch (cause) {
      setHolidays([]);
      setLoaded(false);
      setError(cause);
    } finally {
      setPending(false);
    }
  }

  const groups = groupByMonth(holidays);

  return (
    <section>
      <header className="page-head">
        <p className="kicker">Integração</p>
        <h1 className="page-title">Feriados</h1>
        <p className="lead">
          <code>GET /holidays?year=</code> passa pelo HttpService. A URL fica no ambiente, não no service de tarefa.
          Prazo de tarefa em feriado deve ser recusado com 409.
        </p>
      </header>

      <form className="edit-bar" onSubmit={load}>
        <label className="field">
          <span>Ano</span>
          <input className="input" value={year} onChange={(event) => setYear(event.target.value)} inputMode="numeric" />
          <small>Um ano inválido, ou a API externa fora, deve falhar de forma controlada — status e mensagem, não 500 cru.</small>
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Consultando…' : 'Consultar'}
        </button>
      </form>

      <ErrorNote error={error} />

      {loaded && holidays.length === 0 ? (
        <Empty title="Lista vazia" text="A rota respondeu, mas nenhum feriado foi reconhecido. Confira o JSON no tráfego." />
      ) : null}

      <div className="holiday-grid">
        {groups.map(([month, items]) => (
          <section key={month} className="holiday-card">
            <h2>{month}</h2>
            <ul>
              {items.map((holiday) => (
                <li key={`${holiday.date}-${holiday.name}`}>
                  <time>{formatDate(holiday.date)}</time>
                  <span>{holiday.name}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

function groupByMonth(holidays: Holiday[]) {
  const map = new Map<string, Holiday[]>();
  for (const holiday of holidays) {
    const date = new Date(holiday.date);
    const label = Number.isNaN(date.getTime())
      ? 'Sem mês'
      : new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
    const bucket = map.get(label) ?? [];
    bucket.push(holiday);
    map.set(label, bucket);
  }
  return [...map.entries()];
}
