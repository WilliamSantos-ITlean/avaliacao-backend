import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { parseHolidays } from '../lib/parse';
import type { Holiday } from '../lib/types';
import { ErrorNote } from '../ui';

export function HolidaysPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
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
          {isAdmin ? (
            <>
              <code>GET /holidays?year=</code> passa pelo HttpService. A URL fica no ambiente, não no service de tarefa.
              Prazo de tarefa em feriado deve ser recusado com 409.
            </>
          ) : (
            'Consulta os feriados do ano. O prazo de uma tarefa não pode cair num feriado.'
          )}
        </p>
      </header>

      <form className="holiday-query" onSubmit={load}>
        <label className="field">
          <span>Ano</span>
          <input className="input" value={year} onChange={(event) => setYear(event.target.value)} inputMode="numeric" />
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Consultando…' : 'Consultar'}
        </button>
        {isAdmin ? (
          <small>Um ano inválido, ou a API externa fora, deve falhar de forma controlada — status e mensagem, não 500 cru.</small>
        ) : null}
      </form>

      <ErrorNote error={error} />

      {loaded ? (
        <div className="holiday-grid">
          {MONTHS.map((month, index) => {
            const items = groups[index];
            return (
              <section key={month} className="holiday-card">
                <h2>{month}</h2>
                {items.length === 0 ? (
                  <p className="holiday-empty">Nenhum feriado neste mês.</p>
                ) : (
                  <ul>
                    {items.map((holiday) => (
                      <li key={`${holiday.date}-${holiday.name}`}>
                        <time dateTime={holiday.date}>{formatCalendarDate(holiday.date)}</time>
                        <span>{holiday.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function calendarParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function formatCalendarDate(value: string) {
  const parts = calendarParts(value);
  if (!parts) return value;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function groupByMonth(holidays: Holiday[]) {
  const months = MONTHS.map(() => [] as Holiday[]);
  for (const holiday of holidays) {
    const parts = calendarParts(holiday.date);
    if (!parts) continue;
    months[parts.month - 1].push(holiday);
  }
  for (const items of months) {
    items.sort((left, right) => left.date.localeCompare(right.date));
  }
  return months;
}
