import type { AreaVisualConfig } from '../types';

export const HONGJECHEON_VISUALS: AreaVisualConfig = {
  // 실제 사진을 사용할 때 OSM building feature ID, 공개 경로와 권리 정보를 등록합니다.
  // 예: { featureIds: [123], url: '/textures/buildings/123.webp',
  //   sideUrls: ['/textures/buildings/123-n.webp', '/textures/buildings/123-e.webp'],
  //   attribution: '촬영자', license: 'CC BY 4.0' }
  buildingPhotoTextures: [
    {
      featureIds: [174111567],
      url: '/textures/buildings/seodaemun-gu-office-2014.jpg',
      attribution: '안우석 / Wikimedia Commons · 텍스처 매핑 적용',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Seodaemun-gu_Office_20140513_150237.jpg',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  ],
};
