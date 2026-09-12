import type { LoadedAreaData } from './types';

export interface AreaRegistration {
  id: string;
  name: string;
  subtitle: string;
  load: () => Promise<LoadedAreaData>;
}

const registrations: AreaRegistration[] = [
  {
    id: 'hongjecheon-waterfall',
    name: '홍제천',
    subtitle: '서대문구 인공폭포 구간',
    load: async () => (await import('./hongjecheon/data/loadAreaData')).loadHongjecheonData(),
  },
  {
    id: 'cheonggyecheon-downtown',
    name: '청계천',
    subtitle: '청계광장–수표교 도심 구간',
    load: async () => (await import('./cheonggyecheon/data/loadAreaData')).loadCheonggyecheonData(),
  },
];

export function listAreas(): ReadonlyArray<Omit<AreaRegistration, 'load'>> {
  return registrations.map(({ id, name, subtitle }) => ({ id, name, subtitle }));
}

export function resolveAreaId(candidate: string | null): string {
  return registrations.some((area) => area.id === candidate) ? candidate! : registrations[0].id;
}

export async function loadArea(id: string): Promise<LoadedAreaData> {
  const area = registrations.find((registration) => registration.id === id);
  if (!area) throw new Error(`등록되지 않은 비행 지역입니다: ${id}`);
  return area.load();
}
