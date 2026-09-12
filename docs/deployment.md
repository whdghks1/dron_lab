# DRONE LAB 배포와 성능 확인

## 배포 산출물

```bash
npm ci
npm test
npm run build
```

정적 호스팅의 공개 디렉터리를 `build/`로 지정합니다. 지역은 경로가 아닌 `?area=<area-id>` 쿼리로 선택되므로 별도의 SPA rewrite 규칙이 필요하지 않습니다.

`build/assets/`의 해시가 포함된 파일은 장기 immutable 캐시를 적용할 수 있습니다. `build/index.html`은 새 버전 발견을 위해 짧게 캐시하거나 `no-cache`로 제공하는 편이 안전합니다.

## 런타임 성능 표시

데스크톱 화면 우측 하단 개발 표시의 의미는 다음과 같습니다.

- `FPS`: 최근 0.5초 렌더링 프레임률
- `CHUNK active/cached/limit`: 현재 표시 중인 청크, 메모리에 남은 지도 청크, 품질별 캐시 상한
- `GPU nG nT`: Three.js가 추적하는 geometry와 texture 수
- `LOAD n`: 비동기 로딩 중인 청크 수

긴 경로를 왕복한 뒤 `cached`가 품질별 상한(LOW 10, MEDIUM 18, HIGH 24)을 넘지 않고 GPU geometry 수가 계속 증가하지 않는지 확인합니다.
