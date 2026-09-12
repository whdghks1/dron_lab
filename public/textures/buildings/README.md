# 건물 사진 텍스처

직접 촬영했거나 재사용 권한이 확인된 정면 보정 사진을 WebP로 저장하는 위치입니다.

- 권장 크기: 1024×1024 이하
- 권장 파일명: OSM 건물 ID(예: `123456.webp`)
- 사람 얼굴, 차량 번호판과 상표는 필요한 경우 비식별화
- 사용 항목은 `src/areas/<area>/visuals.ts`에 건물 ID, 파일 경로, 촬영자와 라이선스를 함께 등록
- 면별 사진은 `sideUrls`에 건물 둘레를 따라 시계 방향 순서로 등록

```ts
{
  featureIds: [123456],
  url: '/textures/buildings/123456-n.webp',
  sideUrls: [
    '/textures/buildings/123456-n.webp',
    '/textures/buildings/123456-e.webp',
    '/textures/buildings/123456-s.webp',
    '/textures/buildings/123456-w.webp',
  ],
  attribution: '직접 촬영 · 홍길동',
  license: 'CC BY 4.0',
}
```

원격 이미지는 서버가 CORS를 허용해야 합니다. 지도 서비스나 로드뷰 화면을 내려받거나 캡처·크롭해 독립 텍스처로 포함하는 것은 각 서비스 약관의 별도 허용이 확인되지 않는 한 사용하지 않습니다.
