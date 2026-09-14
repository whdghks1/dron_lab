# Third-party assets

## Seodaemun-gu Office 20140513 150237.jpg

- 프로젝트 내 경로: `public/textures/buildings/seodaemun-gu-office-2014.jpg`
- 사용 위치: OSM building way `174111567`의 서측 외벽
- 제작자: 안우석
- 원본 URL: https://commons.wikimedia.org/wiki/File:Seodaemun-gu_Office_20140513_150237.jpg
- 다운로드 날짜: 2026-09-12
- 라이선스: Creative Commons Attribution-ShareAlike 4.0 International
- 라이선스 URL: https://creativecommons.org/licenses/by-sa/4.0/
- 변경 및 최적화: Wikimedia Commons 제공 1280×960 JPEG 파생본을 저장. 픽셀 편집 없음. v0.10에서는 EXIF 촬영 방향에 대응하는 서측 외벽 한 면에만 반복 매핑

## v0.10 절차형 세부 모델

교량, 제방, 계단, 난간, 가로등, 벤치, 쓰레기통, 자전거 거치대, 표지판, 볼라드, 식생과 인공폭포 placeholder는 저장소 코드에서 직접 생성합니다. v0.10에서는 GLB나 외부 PBR 텍스처를 추가하지 않았으므로 별도 제3자 에셋 라이선스가 없습니다.

## Concrete

- 프로젝트 내 경로: `public/textures/materials/polyhaven/concrete-diff-1k.jpg`, `concrete-normal-gl-512.jpg`, `concrete-rough-512.jpg`
- 사용 위치: 홍제천 교량과 `old-concrete`, `light-concrete` 제방 재질
- 제작자: Rob Tuytel
- 원본 URL: https://polyhaven.com/a/concrete
- 다운로드 날짜: 2026-09-12
- 라이선스: CC0 1.0 Universal
- 라이선스 URL: https://creativecommons.org/publicdomain/zero/1.0/
- 변경 및 최적화: 공식 1K JPEG diffuse/normal OpenGL/roughness를 선택. diffuse는 1024px JPEG 품질 78, normal은 512px 품질 86, roughness는 512px 품질 82로 재인코딩. 원본 MD5는 각각 `795b1fbb460fb38d29c5859ff2c4b5d4`, `17d4bd534e153db3ff469fdfc4484355`, `2e491629157a6d2a2c915d2b2753798c`

## Stone Wall 05

- 프로젝트 내 경로: `public/textures/materials/polyhaven/stone-wall-05-diff-1k.jpg`, `stone-wall-05-normal-gl-512.jpg`, `stone-wall-05-rough-512.jpg`
- 사용 위치: 홍제천 `stone-bank` 제방과 인공폭포 제작 모델의 석재 재질
- 제작자: Charlotte Baglioni
- 원본 URL: https://polyhaven.com/a/stone_wall_05
- 다운로드 날짜: 2026-09-12
- 라이선스: CC0 1.0 Universal
- 라이선스 URL: https://creativecommons.org/publicdomain/zero/1.0/
- 변경 및 최적화: 공식 1K JPEG diffuse/normal OpenGL/roughness를 선택. diffuse는 1024px JPEG 품질 78, normal은 512px 품질 86, roughness는 512px 품질 82로 재인코딩. 원본 MD5는 각각 `2328a634870368815953c5c4332e8d3b`, `3263c9e6b656e53c6385883c16f1ebf9`, `3348d06a0f3bfd1a363c15403ae176be`

두 에셋은 Poly Haven의 CC0 재질이며, 출처와 라이선스 링크를 앱 하단에도 표시합니다. v0.11에는 AO와 displacement, 8K 원본, Blender 파일을 포함하지 않았습니다.

지도 및 표고 데이터의 데이터베이스·데이터 라이선스는 `docs/data-sources.md`를 참고합니다.

## v0.13 공개 사진 참고 범위

v0.13 홍제폭포 보정에는 서울관광재단과 서울시 미디어허브의 공개 안내·현장 사진을 형상과 상대 배치 확인용으로만 사용했습니다. 사진 파일, 지도 타일과 로드뷰 이미지는 저장소에 복사하거나 파생 텍스처로 포함하지 않았습니다. 새 외부 바이너리 에셋은 추가되지 않았으며 새 암벽·낙수·폭포지·관람 시설 geometry는 모두 런타임 코드로 생성합니다.
