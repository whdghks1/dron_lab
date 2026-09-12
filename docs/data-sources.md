# DRONE LAB 지역 데이터 출처와 범위

## OpenStreetMap 스냅샷

- 출처: © OpenStreetMap contributors
- 라이선스: Open Data Commons Open Database License 1.0 (ODbL)
- 원본 안내: https://www.openstreetmap.org/copyright
- 획득 방식: Overpass API의 `way` 형상과 건물 multipolygon `relation`의 닫힌 outer member
- 쿼리 시각: `2026-09-12T07:57:01Z` (스냅샷 메타데이터 기준)
- 쿼리 bbox: 남위도 `37.5762`, 서경도 `126.9320`, 북위도 `37.5850`, 동경도 `126.9430`
- 포함 항목: `waterway`, `natural=water`, `water`, `highway`, `bridge`, `building`, `leisure=park`
- 건물 수: 일반 building way 329개 + relation outer member 9개 = 338개 동
- 저장 위치: `src/areas/hongjecheon/data/osm-snapshot.json`

런타임에는 이 원본을 직접 내려받지 않습니다. `npm run data:chunks`가 240 m 셀 단위의 `generated/chunks/*.json`, 수면만 담은 `base-map.json`, 축약 미니맵과 청크 인덱스를 생성합니다. 이 파일들은 같은 OSM 스냅샷의 파생물이며 출처와 라이선스도 동일합니다.

이 앱과 미니맵은 화면에 `© OpenStreetMap contributors · ODbL` 링크를 상시 표시합니다. 스냅샷 또는 그 파생 데이터베이스를 별도로 배포할 때도 ODbL 의무를 확인해야 합니다.

## SRTM 표고 스냅샷

- 배포처: Mapzen Terrain Tiles 공개 AWS S3 데이터셋
- 원자료: NASA Shuttle Radar Topography Mission(SRTM) 파생 Skadi HGT
- 원본 타일: `N37E126.hgt.gz`
- 원본 해상도: 1 arc-second, 약 30 m
- 잘라낸 범위: OSM bbox와 동일
- 저장 격자: 41×33, 이중선형 보간
- 지역 표고 범위: 약 29.63–227.75 m
- 인공폭포 기준점 격자 표고: 약 39.83 m (원본 직접 샘플 약 40.34 m)
- 저장 위치: `src/areas/hongjecheon/data/elevation.json`
- Mapzen 데이터 권리 안내: https://www.mapzen.com/rights/
- NASA 데이터 이용 안내: https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy

앱은 표고를 절대 해발고도로 직접 표시하지 않고, 인공폭포 기준점 표고를 뺀 상대 장면 고도로 변환합니다. HUD 고도는 보간된 현재 지면 위 높이(AGL)입니다.

## 청계천 도심 스냅샷

- 범위: 남위도 `37.5662`, 서경도 `126.9750`, 북위도 `37.5723`, 동경도 `126.9905`
- OSM 확인 시각: `2026-09-12T10:21:43Z`
- 포함 형상: 건물 1,029개, 도로 283개, 보행 경로 198개와 교량 11개
- 건물 메타데이터: 높이 175개, 층수 138개, 지붕 형태 4개, 재질 또는 외벽 색상 5개
- 런타임 데이터: 240 m 단위 32개 청크
- 표고: 동일한 Mapzen/NASA SRTM `N37E126.hgt.gz`에서 57×29 격자로 추출
- 코스 기준: OSM의 모전교, 광통교, 광교, 삼일대로 교량과 수표교 실제 형상 중심점

청계천 코스 순서는 [서울관광재단 청계천 안내](https://english.visitseoul.net/attractions/cheonggyecheon-stream_/35)와 [청계천 구간 소개](https://english.visitseoul.net/editorspicks/The-Seoul-Lantern-Festival-and-Cheonggyecheon-Stream/32585)가 소개하는 청계광장–광통교–삼일교–수표교 흐름을 참고했습니다. OSM에 기록된 `height`, `building:levels`, `roof:shape`, `building:material`, `building:colour`을 우선 사용하며 값이 없는 건물만 결정적 추정 모델을 사용합니다.

## 기준점과 실제 데이터로 취급하는 항목

로컬 좌표 원점은 OSM Nominatim에서 확인한 **홍제천 인공폭포** 위치 `37.5813046, 126.9378073`입니다. 하천 수면/중심선, 도로 및 보행·자전거 경로, 교량 형상, 건물 윤곽, 공원 윤곽은 OSM 스냅샷에서 가져옵니다. 탐험 코스는 이 실제 형상과 명명된 장소를 따라 수동으로 설계했습니다.

## 추정 또는 제작 데이터

- OSM에 `height` 또는 `building:levels`가 있으면 건물 높이에 사용합니다. 관계형 공동주택 8개 동은 relation의 53 m 높이와 19층 태그를 outer member에 상속합니다.
- 높이 태그가 없으면 7–31 m 범위의 결정적 추정값을 사용합니다. 이는 실제 높이가 아닙니다.
- SRTM 격자로 표현하지 못하는 제방·계단·미세 지형, 장식용 나무, 착륙 패드, 탐험 링은 MVP용 제작 요소입니다.
- 하천과 도로는 DEM 표면을 따르지만 수면 및 교량의 세부 높이는 시각적 분리를 위한 근사값입니다.
- 로드뷰 이미지와 지도 타일은 수집하거나 포함하지 않았습니다. 제3자 사진은 아래에 출처와 라이선스를 명시한 Wikimedia Commons 파일 한 장만 포함합니다.
- 공식 공역, 비행금지·제한구역, 임시 제한 데이터는 수집하거나 포함하지 않았습니다.
- 건물 창문 패턴과 흐르는 수면 무늬는 코드에서 생성한 절차형 텍스처입니다.
- 옥상 파라펫·설비실·물탱크·캐노피·발코니 띠는 실제 윤곽과 건물 용도를 바탕으로 생성하지만 실제 설비의 위치·형태를 재현한 것은 아닙니다.

## 실제 건물 사진 텍스처

서대문구청 본관에 [Wikimedia Commons 원본](https://commons.wikimedia.org/wiki/File:Seodaemun-gu_Office_20140513_150237.jpg)의 `Seodaemun-gu Office 20140513 150237.jpg` 1280px 파생본을 적용합니다. 저자는 안우석, 라이선스는 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)이며 OSM townhall 중심점이 들어 있는 building way `174111567`에만 연결합니다. 원본 EXIF의 카메라 위치와 약 81.4° 촬영 방향을 근거로 카메라가 동쪽을 향해 촬영한 서측 외벽 사진으로 판정했습니다. v0.10부터 해당 방향 한 면에만 적용하고 다른 외벽은 절차형 재질로 유지합니다. 상세 출처와 변경 표시는 `public/textures/buildings/seodaemun-gu-office-2014.LICENSE.md`에 기록했습니다.

추가 외관 사진 조사 결과와 OSM ID 연결이 보류된 이유는 [홍제천 사진 후보 문서](hongjecheon-photo-candidates.md)에 기록했습니다. 라이선스만 명확하고 대상 건물·촬영 방향 연결이 불확실한 사진은 포함하지 않았습니다.

## 건물 수동 보강값

원본 OSM과 수동 확인값을 섞지 않기 위해 `building-overrides.json`을 별도로 관리합니다. 현재는 [서대문자연사박물관 공식 층별 안내](https://namu.sdm.go.kr/web/main/contents/guide_facility_floor)의 1F–3F를 근거로 building way `174109591`의 `levels`를 3으로 보강합니다. 실제 높이 자료는 아니므로 렌더링 높이는 층당 3.2 m의 추정값입니다.

따라서 이 버전은 실제 평면 위치 관계와 약 30 m 표고를 기반으로 하지만 측량·항법·실제 비행 용도로 사용할 수 없습니다.

## v0.10 홍제천 세부 모델의 출처 구분

- `osm`: 교량과 산책·자전거 경로의 평면 중심선, 하천 중심선, 건물 윤곽
- `estimated`: 교량 폭·상판 두께·높이·교각 수와 재질 preset. OSM 형상 위에 추정값으로 생성
- `authored`: 제방 구간별 프로파일, 계단 진입로, 난간·가로등·벤치 등 소품 규칙, 식생 분포와 인공폭포 placeholder

`authored` 항목은 현장 조사나 측량값이 아니며 실제 시설의 정확한 위치·개수·형상을 의미하지 않습니다. 모든 텍스처와 geometry는 코드에서 생성했고 v0.10에서 새 외부 바이너리 에셋은 추가하지 않았습니다.

## v0.11 홍제천 PBR 재질

홍제천의 콘크리트 교량·제방과 석재 제방에는 Poly Haven의 [Concrete](https://polyhaven.com/a/concrete)와 [Stone Wall 05](https://polyhaven.com/a/stone_wall_05)를 사용합니다. Poly Haven은 사이트의 에셋을 [CC0](https://polyhaven.com/license)로 제공합니다. 두 재질은 특정 홍제천 시설의 실제 표면 자료가 아닌 범용 재질이며, 위치·형상 데이터의 정확도를 높이는 자료로 간주하지 않습니다.

Low는 1K diffuse만 사용하고 Medium/High는 512px OpenGL normal과 roughness를 추가합니다. AO·displacement와 원본 8K 파일은 포함하지 않았습니다. 파일별 원본 체크섬과 최적화 내용은 `THIRD_PARTY_ASSETS.md`에 기록했습니다.

## v0.12 건물 충돌과 도로 표현

건물 충돌과 원거리 LOD는 OSM building way 또는 relation outer member의 실제 평면 외곽선을 사용합니다. 오목한 건물도 전체 축 정렬 경계 상자가 아닌 다각형 내부와 변의 거리를 검사하므로, 외곽선 밖의 빈 모서리는 충돌 영역에 포함하지 않습니다. 수직 범위는 OSM `min_height`와 높이 태그 또는 기존 추정 높이를 따릅니다.

도로와 경로의 중심선·종류는 현재 OSM 스냅샷에서 가져옵니다. 아스팔트 무늬, 도로 등급별 기본 폭, 보도, 가장자리 선, 중앙 점선과 자전거길 경계선은 코드로 생성한 시각 요소이며 현장 측량값이 아닙니다. `scripts/import-osm.mjs`는 새 스냅샷에서 `width`, `lanes`, `surface`, `sidewalk` 태그를 보존하고, 렌더러는 명시된 폭·차선·보도 값을 기본 규칙보다 우선합니다. 현재 포함된 스냅샷은 v0.12 이전 형식이어서 대부분 도로에 이 태그가 없으며 도로 등급 기반 추정값을 사용합니다.

## v0.13 홍제폭포 시각 보정

[서울관광재단 홍제폭포 안내](https://korean.visitseoul.net/nature/2024-hongjewaterfall/KOP2xzi3t)의 폭 약 60 m·높이 약 25 m를 랜드마크 외형 기준으로 사용했습니다. [서울시 미디어허브 2023 현장 기사](https://mediahub.seoul.go.kr/archives/2008294)와 [2025 현장 기사](https://mediahub.seoul.go.kr/archives/2014009)의 공개 사진은 폭포, 폭포지, 관람 공간과 내부순환로의 상대 배치를 판독하는 시각 참고 자료로만 사용했습니다. 해당 사진과 Google 지도·로드뷰 이미지는 다운로드하거나 텍스처로 포함하지 않았습니다.

하천 중심선과 내부순환로 평면 형상은 기존 OSM 스냅샷입니다. 수로 상대고도 -4.35~-5.82 m, 보정 중심 폭 9.2 m, DEM 혼합 폭 8.2 m, 폭포 깊이·폭포지·세부 암반·낙수·데크·징검석·교각 치수는 공개 자료의 공간 관계를 바탕으로 코드에서 만든 `authored` 값이며 측량값이 아닙니다. 전체 판단 기록은 [v0.13 홍제천 시각 보정 기록](hongjecheon-visual-calibration-v0.13.md)을 참고하세요.

## 공역 정보 상태

두 지역의 공역 상태는 명시적으로 `unavailable`입니다. 상단 안전 패널은 이 상태를 사용자에게 알리며, 앱의 100 m 상한과 지역 경계는 시뮬레이션용 규칙입니다. 향후 공식 데이터가 연결되더라도 수집 시각, 원문 출처 URL, 고도 기준과 만료 정책을 함께 제공해야 합니다. 자세한 계약은 [공역 데이터 문서](airspace.md)를 참고하세요.

## 서울 공공데이터 확장 시 주의

서울 열린데이터광장 자료를 추가할 경우 각 데이터셋의 개별 라이선스와 제3자 권리를 확인하고, 결과 화면에 `서울특별시 공공데이터` 사용 사실을 표시해야 합니다. 현재 MVP 스냅샷에는 서울 열린데이터광장 데이터가 포함되어 있지 않습니다.
