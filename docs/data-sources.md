# 홍제천 MVP 데이터 출처와 범위

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

## 기준점과 실제 데이터로 취급하는 항목

로컬 좌표 원점은 OSM Nominatim에서 확인한 **홍제천 인공폭포** 위치 `37.5813046, 126.9378073`입니다. 하천 수면/중심선, 도로 및 보행·자전거 경로, 교량 형상, 건물 윤곽, 공원 윤곽은 OSM 스냅샷에서 가져옵니다. 탐험 코스는 이 실제 형상과 명명된 장소를 따라 수동으로 설계했습니다.

## 추정 또는 제작 데이터

- OSM에 `height` 또는 `building:levels`가 있으면 건물 높이에 사용합니다. 관계형 공동주택 8개 동은 relation의 53 m 높이와 19층 태그를 outer member에 상속합니다.
- 높이 태그가 없으면 7–31 m 범위의 결정적 추정값을 사용합니다. 이는 실제 높이가 아닙니다.
- SRTM 격자로 표현하지 못하는 제방·계단·미세 지형, 장식용 나무, 착륙 패드, 탐험 링은 MVP용 제작 요소입니다.
- 하천과 도로는 DEM 표면을 따르지만 수면 및 교량의 세부 높이는 시각적 분리를 위한 근사값입니다.
- 로드뷰 이미지, 지도 타일, 제3자 텍스처는 수집하거나 포함하지 않았습니다.
- 공식 공역, 비행금지·제한구역, 임시 제한 데이터는 수집하거나 포함하지 않았습니다.
- 건물 창문 패턴과 흐르는 수면 무늬는 코드에서 생성한 절차형 텍스처입니다.
- 옥상 파라펫·설비실·물탱크·캐노피·발코니 띠는 실제 윤곽과 건물 용도를 바탕으로 생성하지만 실제 설비의 위치·형태를 재현한 것은 아닙니다.

## 실제 건물 사진 텍스처

앱은 OSM 건물 feature ID별 사진 텍스처를 지원하지만 현재 배포본에는 실제 외벽 사진이 포함되어 있지 않습니다. 사진을 추가할 때는 직접 촬영본 또는 명시적으로 재사용이 허용된 원본만 사용하고, `visuals.ts`에 촬영자·라이선스를 기록해야 합니다. 이 정보는 앱 하단 출처 영역에도 표시됩니다. 자세한 등록 방법은 `public/textures/buildings/README.md`를 참고하세요.

따라서 이 버전은 실제 평면 위치 관계와 약 30 m 표고를 기반으로 하지만 측량·항법·실제 비행 용도로 사용할 수 없습니다.

## 공역 정보 상태

홍제천 지역의 공역 상태는 명시적으로 `unavailable`입니다. 상단 안전 패널은 이 상태를 사용자에게 알리며, 앱의 100 m 상한과 약 1 km 경계는 시뮬레이션용 규칙입니다. 향후 공식 데이터가 연결되더라도 수집 시각, 원문 출처 URL, 고도 기준과 만료 정책을 함께 제공해야 합니다. 자세한 계약은 [공역 데이터 문서](airspace.md)를 참고하세요.

## 서울 공공데이터 확장 시 주의

서울 열린데이터광장 자료를 추가할 경우 각 데이터셋의 개별 라이선스와 제3자 권리를 확인하고, 결과 화면에 `서울특별시 공공데이터` 사용 사실을 표시해야 합니다. 현재 MVP 스냅샷에는 서울 열린데이터광장 데이터가 포함되어 있지 않습니다.
