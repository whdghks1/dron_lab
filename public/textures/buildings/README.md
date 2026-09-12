# 건물 사진 텍스처

직접 촬영했거나 재사용 권한이 확인된 정면 보정 사진을 WebP로 저장하는 위치입니다.

- 권장 크기: 1024×1024 이하
- 권장 파일명: OSM 건물 ID(예: `123456.webp`)
- 사람 얼굴, 차량 번호판과 상표는 필요한 경우 비식별화
- 사용 항목은 `src/areas/<area>/visuals.ts`에 건물 ID, 파일 경로, 촬영자와 라이선스를 함께 등록
- 새 면별 사진은 `facades`에 실제 방위와 함께 등록. 기존 `sideUrls`도 호환을 위해 지원

```ts
{
  featureIds: [123456],
  url: '/textures/buildings/123456-n.webp',
  facades: [
    { direction: 'north', url: '/textures/buildings/123456-n.webp' },
    { direction: 'east', url: '/textures/buildings/123456-e.webp' },
  ],
  attribution: '직접 촬영 · 홍길동',
  license: 'CC BY 4.0',
  sourceUrl: 'https://example.com/original',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
}
```

기존 `sideUrls`는 건물 둘레 순서대로 사진을 순환 적용하는 호환 필드입니다. `facades`와 함께 지정하면 방향이 명시된 `facades`가 우선합니다.

원격 이미지는 서버가 CORS를 허용해야 합니다. 지도 서비스나 로드뷰 화면을 내려받거나 캡처·크롭해 독립 텍스처로 포함하는 것은 각 서비스 약관의 별도 허용이 확인되지 않는 한 사용하지 않습니다.
