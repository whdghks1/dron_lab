import type { AreaConfig } from '../types';
import { geoToLocal } from '../../utils/geo';

export const CHEONGGYECHEON_ORIGIN = { lat: 37.56925, lon: 126.9787 } as const;

const point = (lat: number, lon: number, y: number) => ({ ...geoToLocal({ lat, lon }, CHEONGGYECHEON_ORIGIN), y });

export const CHEONGGYECHEON_CONFIG: AreaConfig = {
  id: 'cheonggyecheon-downtown',
  name: '청계천',
  subtitle: '청계광장–수표교 도심 구간',
  origin: CHEONGGYECHEON_ORIGIN,
  bounds: { minX: -280, maxX: 1030, minZ: -310, maxZ: 310 },
  start: point(37.5692417, 126.9786758, 2.5),
  startYaw: -Math.PI / 2,
  sourceUrl: 'https://www.openstreetmap.org/copyright',
  checkpoints: [
    { id: 'cheonggye-plaza', title: '청계광장', description: '청계천 도심 물길의 시작점입니다.', position: point(37.5692417, 126.9786758, 8) },
    { id: 'mojeongyo', title: '모전교', description: '청계광장 동쪽의 첫 도로 교량입니다.', position: point(37.5691425, 126.9792951, 9) },
    { id: 'gwangtonggyo', title: '광통교', description: '복원된 석축 보행교 구간을 통과합니다.', position: point(37.5690064, 126.9810366, 8) },
    { id: 'gwanggyo', title: '광교', description: '도심 가로와 청계천이 교차하는 지점입니다.', position: point(37.5688845, 126.9827724, 10) },
    { id: 'samilgyo', title: '삼일교', description: '삼일대로 아래 넓은 교량 구간입니다.', position: point(37.5681424, 126.9876517, 12) },
    { id: 'supyogyo', title: '수표교', description: '청계광장에서 약 1 km 떨어진 반환 지점입니다.', position: point(37.5681965, 126.9901521, 9) },
  ],
};
