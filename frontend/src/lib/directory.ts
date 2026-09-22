import { PEOPLE_KEY } from './keys';
import type { SessionUser } from './types';

export function readPeople(): SessionUser[] {
  try {
    const raw = localStorage.getItem(PEOPLE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SessionUser => {
      if (!item || typeof item !== 'object') return false;
      const row = item as SessionUser;
      return Boolean(row.id && row.email && row.role);
    });
  } catch {
    return [];
  }
}

export function rememberPerson(person: SessionUser) {
  const next = [person, ...readPeople().filter((item) => item.id !== person.id)].slice(0, 40);
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(next));
}

export function patchRememberedRole(id: string, role: SessionUser['role']) {
  const next = readPeople().map((person) => (person.id === id ? { ...person, role } : person));
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(next));
}
