# v0.10 홍제천 장면 성능 기준

## 측정 방법

`npm run perf:scene`은 WebGL 렌더러 없이 동일한 홍제천 전체 스냅샷으로 장면을 만들고, 현재 품질에서 보이는 메시·인스턴스·geometry·삼각형을 정적으로 집계합니다. LOD의 카메라별 실제 선택과 GPU/브라우저 성능은 반영하지 않으므로 회귀 비교용 지표입니다. 실행 중 앱 HUD에서는 실제 FPS, draw call, triangle, GPU geometry/texture, 활성·캐시 청크 수를 표시합니다.

## 변경 전 기준

기준 커밋 `1cc0132`의 High 시작 장면 정적 계측:

- draw 추정: 156
- triangles: 72,162
- geometries: 129
- colliders: 486
- active chunks: 18

## v0.10 상세 장면

초기 구현 계측에서 충돌체가 1,006개까지 증가해, 난간 충돌을 인스턴스별 박스가 아닌 원본 경로 구간별 박스로 합쳤습니다. 최종 계측값은 `npm run perf:scene` 결과를 갱신 기준으로 사용합니다.

| 품질 | draw 추정 | triangles | geometries | textures | InstancedMesh | colliders | active chunks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | 100 | 41,236 | 100 | 11 | 52 | 613 | 7 |
| Medium | 185 | 97,844 | 185 | 11 | 121 | 613 | 12 |
| High | 246 | 133,782 | 246 | 11 | 165 | 613 | 17 |

High 기준으로 v0.9보다 draw 추정은 약 57.7%, triangles는 약 85.4% 증가했습니다. 대신 교량 상·하부 구조, 5종 제방, 7종 소품, 3종 식생과 인공폭포가 추가됐습니다. Low에서는 High 대비 draw 추정 59.3%, triangles 69.2%를 줄입니다.

프로덕션 빌드의 초기 핵심 JavaScript gzip 합계(공통 앱 + Three.js + 홍제천 지역 로더)는 약 165.08 kB에서 173.41 kB로 약 8.33 kB 증가했습니다. 새 외부 GLB/PBR 파일이 없어 초기 바이너리 에셋 크기는 증가하지 않았고, 기존 380,038 byte 서대문구청 JPEG만 유지합니다. 정적 texture 수 11개는 화면에 보이는 코드 생성 재질만 세며, 브라우저에서 비동기로 로드되는 서대문구청 JPEG는 앱 HUD의 GPU texture 수로 별도 확인합니다.

세부 모델 추가로 High의 정적 장면 복잡도는 증가하지만 교량 구조, 소품, 난간, 계단과 나무는 `InstancedMesh`로 묶습니다. Low는 고비용 소품과 안개를 숨기고 식생을 약 1/4 밀도로 제한하며, Medium은 약 1/2, High는 전체 밀도를 사용합니다. 청크 LRU는 기존 10/18/24 한도를 유지하고 제거 시 해당 청크의 geometry와 충돌체를 회수합니다.

실제 FPS 목표(Desktop High 60 FPS, Mobile Low 30 FPS)는 기기별 브라우저 측정이 필요합니다. 연결 가능한 브라우저가 없는 환경에서는 정적 계측과 자동 회귀 테스트만 기록합니다.
