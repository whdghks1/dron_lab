# v0.11 PBR 재질 성능 기록

## 전송 크기

| 품질 | 로드 맵 | 추가 파일 수 | 추가 전송량 |
| --- | --- | ---: | ---: |
| Low | concrete/stone diffuse | 2 | 849,967 bytes |
| Medium/High | diffuse + normal + roughness | 6 | 1,171,833 bytes |

브라우저 캐시 이후 품질 전환에서는 같은 URL을 다시 네트워크로 받을 필요가 없습니다. High/Medium에서 Low로 전환하면 material에서 normal/roughness 참조를 해제하고 해당 texture에 `dispose()`를 호출합니다.

## 코드와 장면 복잡도

v0.10과 geometry·인스턴스 배치는 같으므로 정적 draw/triangle/geometry/collider 수는 변하지 않습니다. 프로덕션 빌드의 핵심 JavaScript gzip 합계(공통 앱 26.37 kB + Three.js 133.70 kB + 홍제천 로더 14.35 kB)는 약 174.42 kB로, v0.10의 173.41 kB보다 약 1.01 kB 증가했습니다.

실제 GPU texture 수와 FPS는 앱 HUD에서 확인해야 합니다. 현재 자동화 환경에는 연결된 브라우저가 없어 HTTP 응답과 품질 정책 단위 테스트까지만 검증했습니다.
