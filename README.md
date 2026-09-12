# DRONE LAB — Riverside Flight Simulator
# DRONE LAB — Riverside Flight Simulator

브라우저에서 바로 실행되는 가벼운 3D 드론 비행 시뮬레이터입니다.

## 실행

별도 설치나 빌드가 필요하지 않습니다. `dist/index.html`을 브라우저에서 열거나 VS
Code의 Live Server로 실행하세요.
```bash
python3 -m http.server 8080 --directory dist
```

그다음 `http://localhost:8080`을 엽니다.

## 조작

- `W A S D`: 전후좌우 이동
- `↑ ↓`: 상승·하강
- `Q E`: 회전
- `Space`: 브레이크
- `Shift`: 부스트
- `C`: 추적/1인칭 시점 전환
- `P`: 일시정지
- `R`: 출발점으로 초기화

## 구성

- `dist/index.html`: 게임 화면
- `dist/style.css`: UI 디자인과 반응형 스타일
- `dist/app.js`: 월드 렌더링, 비행 조작, 충돌 및 게이트 판정

외부 JavaScript 라이브러리 없이 Canvas 2D로 렌더링하므로, 파일 세 개만으로 실행
할 수 있습니다.
