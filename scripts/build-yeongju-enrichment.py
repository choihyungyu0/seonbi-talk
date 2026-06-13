from __future__ import annotations

import json
import math
import os
import urllib.parse
import urllib.request
import hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "public" / "data" / "yeongju-enrichment.json"
KST = timezone(timedelta(hours=9))
SERVICE_TIMEOUT_SECONDS = 45
PUBLIC_TOILET_PAGE_SIZE = 2000
YEONGJU_GRID = {"nx": 89, "ny": 111}
YEONGJU_AREA_NO = "4721000000"


def main() -> None:
    service_key = load_service_key()
    data = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))

    restaurants = fetch_items(
        "http://apis.data.go.kr/5090000/goodRestaurantStatusService/getGoodRestaurantStatus",
        service_key,
        {"pageNo": 1, "numOfRows": 1000, "type": "json"},
    )
    safe_restaurants = fetch_items(
        "http://apis.data.go.kr/5090000/safeRestaurantService/getSafeRestaurant",
        service_key,
        {"pageNo": 1, "numOfRows": 1000, "type": "json"},
    )
    rural_facilities = fetch_items(
        "http://apis.data.go.kr/5090000/ruralTourismFacilitiesService/getRuralTourismFacilities",
        service_key,
        {"pageNo": 1, "numOfRows": 1000, "type": "json"},
    )
    rural_homestays = fetch_items(
        "http://apis.data.go.kr/5090000/ruralHomestayReportListService/getRuralHomestayReportList",
        service_key,
        {"pageNo": 1, "numOfRows": 1000, "type": "json"},
    )
    toilet_rows, toilet_total = fetch_yeongju_public_toilets(service_key)
    forecast_items = fetch_weather_forecast(service_key)
    uv_items = fetch_uv_index(service_key)

    data["generatedAt"] = datetime.now(KST).isoformat(timespec="seconds")
    data["localRestaurants"] = [
        normalize_restaurant(row, index)
        for index, row in enumerate(restaurants, start=1)
    ]
    data["safeRestaurants"] = [
        normalize_safe_restaurant(row, index)
        for index, row in enumerate(safe_restaurants, start=1)
    ]
    data["ruralTourismFacilities"] = [
        normalize_rural_facility(row, index)
        for index, row in enumerate(rural_facilities, start=1)
    ]
    data["ruralHomestays"] = [
        normalize_rural_homestay(row, index)
        for index, row in enumerate(rural_homestays, start=1)
    ]
    data["publicToilets"] = [
        normalize_public_toilet(row, index)
        for index, row in enumerate(toilet_rows, start=1)
    ]
    data["officialSeonbiFestival"] = create_official_seonbi_festival()
    data["weatherSummary"] = create_weather_summary(forecast_items, uv_items)
    data["accessibilitySummary"] = create_accessibility_summary(data)
    data["transitAccess"] = create_transit_access(data)
    data["sourceInventory"] = upsert_source_inventory(
        data.get("sourceInventory", []),
        [
            {
                "id": "good_restaurants",
                "label": "영주시 맛집 현황 OpenAPI",
                "fileName": "영주시 맛집 현황 OpenAPI",
                "rows": len(restaurants),
                "appliedRows": len(restaurants),
            },
            {
                "id": "safe_restaurants",
                "label": "영주시 안심식당 OpenAPI",
                "fileName": "영주시 안심식당 OpenAPI",
                "rows": len(safe_restaurants),
                "appliedRows": len(safe_restaurants),
            },
            {
                "id": "rural_tourism_facilities",
                "label": "영주시 농촌관광시설 OpenAPI",
                "fileName": "영주시 농촌관광시설 OpenAPI",
                "rows": len(rural_facilities),
                "appliedRows": len(rural_facilities),
            },
            {
                "id": "rural_homestays",
                "label": "영주시 농어촌민박 OpenAPI",
                "fileName": "영주시 농어촌민박 OpenAPI",
                "rows": len(rural_homestays),
                "appliedRows": len(rural_homestays),
            },
            {
                "id": "public_toilets",
                "label": "전국 공중화장실 정보 OpenAPI",
                "fileName": "공중화장실 정보 서비스",
                "rows": toilet_total,
                "appliedRows": len(toilet_rows),
                "note": "전국 데이터에서 영주시 주소·관리기관 행만 필터링하고 좌표는 주소 권역 대표점으로 보정",
            },
            {
                "id": "official_seonbi_festival",
                "label": "2026 영주 한국선비문화축제 공식 안내",
                "fileName": "yctf.or.kr/seonbi",
                "rows": 1,
                "appliedRows": 1,
            },
            {
                "id": "weather_forecast",
                "label": "기상청 단기예보",
                "fileName": "VilageFcstInfoService_2.0",
                "rows": len(forecast_items),
                "appliedRows": 1 if forecast_items else 0,
            },
            {
                "id": "living_weather_index",
                "label": "기상청 생활기상 자외선지수",
                "fileName": "LivingWthrIdxServiceV5",
                "rows": len(uv_items),
                "appliedRows": 1 if uv_items else 0,
            },
            {
                "id": "accessibility_derived",
                "label": "무장애·편의시설 파생 지표",
                "fileName": "주차장·공중화장실 보강 데이터",
                "rows": len(data.get("parkingLots", [])) + len(toilet_rows),
                "appliedRows": len(data.get("parkingLots", [])) + len(toilet_rows),
                "note": "장애인 주차 가능 여부, 장애인 화장실·비상벨 정보를 추천 편의 근거로 사용",
            },
        ],
    )

    OUTPUT_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "restaurants": len(restaurants),
                "safeRestaurants": len(safe_restaurants),
                "ruralTourismFacilities": len(rural_facilities),
                "ruralHomestays": len(rural_homestays),
                "publicToilets": len(toilet_rows),
                "weatherForecastItems": len(forecast_items),
                "uvIndexItems": len(uv_items),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def load_service_key() -> str:
    candidates = [os.environ.get("TOUR_API_SERVICE_KEY")]
    env_path = ROOT / ".env.local"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            if key.strip() == "TOUR_API_SERVICE_KEY":
                candidates.append(value.strip().strip('"').strip("'"))

    service_key = next((value for value in candidates if value), "")
    if not service_key:
        raise RuntimeError("TOUR_API_SERVICE_KEY is required")
    return service_key


def fetch_items(
    endpoint: str,
    service_key: str,
    params: dict[str, Any],
) -> list[dict[str, Any]]:
    data = fetch_json(endpoint, service_key, params)
    body = data.get("response", {}).get("body", {})
    raw_items = body.get("items", {}).get("item", [])
    if isinstance(raw_items, dict):
        return [raw_items]
    return raw_items if isinstance(raw_items, list) else []


def fetch_json(
    endpoint: str,
    service_key: str,
    params: dict[str, Any],
) -> dict[str, Any]:
    query = urllib.parse.urlencode({**params, "serviceKey": service_key})
    with urllib.request.urlopen(
        f"{endpoint}?{query}",
        timeout=SERVICE_TIMEOUT_SECONDS,
    ) as response:
        return json.loads(response.read().decode("utf-8", errors="replace"))


def fetch_yeongju_public_toilets(service_key: str) -> tuple[list[dict[str, Any]], int]:
    endpoint = "http://apis.data.go.kr/1741000/public_restroom_info_v2/info_v2"
    first = fetch_json(
        endpoint,
        service_key,
        {"pageNo": 1, "numOfRows": PUBLIC_TOILET_PAGE_SIZE, "type": "json"},
    )
    body = first.get("response", {}).get("body", {})
    total = to_int(body.get("totalCount"))
    rows = extract_toilet_items(body)
    page_count = max(1, math.ceil(total / PUBLIC_TOILET_PAGE_SIZE))

    for page_no in range(2, page_count + 1):
        page = fetch_json(
            endpoint,
            service_key,
            {
                "pageNo": page_no,
                "numOfRows": PUBLIC_TOILET_PAGE_SIZE,
                "type": "json",
            },
        )
        rows.extend(extract_toilet_items(page.get("response", {}).get("body", {})))

    yeongju_rows = [row for row in rows if is_yeongju_toilet(row)]
    return yeongju_rows, total


def extract_toilet_items(body: dict[str, Any]) -> list[dict[str, Any]]:
    raw_items = body.get("items", {}).get("item", [])
    if isinstance(raw_items, dict):
        return [raw_items]
    return raw_items if isinstance(raw_items, list) else []


def is_yeongju_toilet(row: dict[str, Any]) -> bool:
    text = " ".join(str(value) for value in row.values())
    return "영주시" in text or "영주" in str(row.get("MNG_INST_NM", ""))


def fetch_weather_forecast(service_key: str) -> list[dict[str, Any]]:
    try:
        return fetch_items(
            "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
            service_key,
            {
                "dataType": "JSON",
                "pageNo": 1,
                "numOfRows": 120,
                "base_date": "20260613",
                "base_time": "0500",
                **YEONGJU_GRID,
            },
        )
    except Exception:
        return []


def fetch_uv_index(service_key: str) -> list[dict[str, Any]]:
    try:
        return fetch_items(
            "http://apis.data.go.kr/1360000/LivingWthrIdxServiceV5/getUVIdxV5",
            service_key,
            {
                "dataType": "JSON",
                "pageNo": 1,
                "numOfRows": 10,
                "areaNo": YEONGJU_AREA_NO,
                "time": "2026061306",
            },
        )
    except Exception:
        return []


def normalize_restaurant(row: dict[str, Any], index: int) -> dict[str, Any]:
    title = clean_text(row.get("BSSH_NM")) or f"영주맛집 {index}"
    address = clean_text(row.get("ADRES"))
    return {
        "id": f"good-restaurant-{row.get('REG_NO') or index}",
        "title": title,
        "address": address,
        "tel": clean_text(row.get("TELNO")),
        **coordinate_fields(address, title, index),
        "source": "YeongjuGoodRestaurantOpenData",
    }


def normalize_safe_restaurant(row: dict[str, Any], index: int) -> dict[str, Any]:
    title = clean_text(row.get("BSNES_NM")) or f"안심식당 {index}"
    address = clean_text(row.get("ADRES"))
    return {
        "id": f"safe-restaurant-{row.get('REG_NO') or index}",
        "title": title,
        "businessType": clean_text(row.get("INDUTY")),
        "businessTypeDetail": clean_text(row.get("INDUTY_DETAIL")),
        "address": address,
        "tel": clean_text(row.get("TELNO")),
        "designationDate": millis_to_date(row.get("DSGN_YMD")),
        **coordinate_fields(address, title, index),
        "source": "YeongjuSafeRestaurantOpenData",
    }


def normalize_rural_facility(row: dict[str, Any], index: int) -> dict[str, Any]:
    title = clean_text(row.get("TRRSRT_NM")) or f"농촌관광시설 {index}"
    address = clean_text(row.get("RDNMADR"))
    return {
        "id": f"rural-tourism-{stable_id(title, index)}",
        "title": title,
        "address": address,
        "tel": clean_text(row.get("TELNO")),
        **coordinate_fields(address, title, index),
        "source": "YeongjuRuralTourismOpenData",
    }


def normalize_rural_homestay(row: dict[str, Any], index: int) -> dict[str, Any]:
    title = clean_text(row.get("NM")) or f"농어촌민박 {index}"
    address = clean_text(row.get("RDNMADR"))
    return {
        "id": f"rural-homestay-{row.get('REG_NO') or index}",
        "title": title,
        "address": address,
        "businessStartDate": millis_to_date(row.get("BSN_BEGIN_DE")),
        "roomCount": to_int(row.get("RUM_CO")),
        **coordinate_fields(address, title, index),
        "source": "YeongjuRuralHomestayOpenData",
    }


def normalize_public_toilet(row: dict[str, Any], index: int) -> dict[str, Any]:
    title = clean_text(row.get("RSTRM_NM")) or f"공중화장실 {index}"
    road_address = clean_text(row.get("LCTN_ROAD_NM_ADDR"))
    lot_address = clean_text(row.get("LCTN_LOTNO_ADDR"))
    address = road_address or lot_address
    disabled_count = sum(
        to_int(row.get(key))
        for key in (
            "MALE_FRDBL_TOILT_CNT",
            "MALE_FRDBL_URNL_CNT",
            "FEMALE_FRDBL_TOILT_CNT",
        )
    )
    child_count = sum(
        to_int(row.get(key))
        for key in (
            "MALE_CHLD_TOILT_CNT",
            "MALE_CHLD_URNL_CNT",
            "FEMALE_CHLD_TOILT_CNT",
        )
    )
    return {
        "id": f"public-toilet-{row.get('MNG_NO') or index}",
        "title": title,
        "address": address,
        "roadAddress": road_address,
        "lotAddress": lot_address,
        "openHours": clean_text(row.get("OPN_HR_DTL")) or clean_text(row.get("OPN_HR")),
        "manager": clean_text(row.get("MNG_INST_NM")),
        "tel": clean_text(row.get("TELNO")),
        "emergencyBell": clean_text(row.get("EMRGNCBLL_INSTL_YN")) == "Y",
        "emergencyBellPlace": clean_text(row.get("EMRGNCBLL_INSTL_PLC")),
        "disabledToiletCount": disabled_count,
        "childToiletCount": child_count,
        **coordinate_fields(address, title, index),
        "source": "PublicToiletOpenData",
    }


def create_official_seonbi_festival() -> dict[str, Any]:
    return {
        "id": "official-2026-yeongju-seonbi-festival",
        "title": "2026 영주 한국선비문화축제",
        "startDate": "2026-05-02",
        "endDate": "2026-05-05",
        "venues": [
            "선비세상",
            "선비촌",
            "선비문화수련원",
            "소수서원",
            "영주 시내 일원",
        ],
        "address": "경상북도 영주시 순흥면 선비세상·소수서원 권역",
        "mapX": 128.5843,
        "mapY": 36.9198,
        "coordinateSource": "official-main-venue",
        "programs": [
            "선비축전",
            "전통문화 체험",
            "선비촌·소수서원 권역 연계 관람",
            "영주 시내 행사 연계",
        ],
        "homepage": "https://yctf.or.kr/seonbi/",
        "source": "YeongjuOfficialFestival",
    }


def create_weather_summary(
    forecast_items: list[dict[str, Any]],
    uv_items: list[dict[str, Any]],
) -> dict[str, Any]:
    first_time = first_forecast_time(forecast_items)
    values = {
        item.get("category"): item.get("fcstValue")
        for item in forecast_items
        if (item.get("fcstDate"), item.get("fcstTime")) == first_time
    }
    uv = uv_items[0] if uv_items else {}
    uv_values = [to_int(uv.get(key)) for key in ("h0", "h3", "h6", "h9", "h12")]
    max_uv = max(uv_values) if uv_values else 0
    temp = clean_text(values.get("TMP"))
    pop = clean_text(values.get("POP"))
    pty = clean_text(values.get("PTY"))
    sky = clean_text(values.get("SKY"))

    guidance = []
    if pop and to_int(pop) >= 50:
        guidance.append("강수확률이 높아 실내 체험과 짧은 이동 동선을 우선합니다.")
    if max_uv >= 8:
        guidance.append("자외선지수가 높아 그늘·실내 휴식 지점을 함께 추천합니다.")
    if not guidance:
        guidance.append("야외 관광과 실내 휴식 지점을 함께 조합할 수 있는 날씨입니다.")

    return {
        "locationLabel": "영주시 중심 격자",
        "nx": YEONGJU_GRID["nx"],
        "ny": YEONGJU_GRID["ny"],
        "baseDate": "2026-06-13",
        "baseTime": "05:00",
        "forecastDate": format_forecast_time(first_time),
        "temperatureC": to_int(temp),
        "precipitationProbability": to_int(pop),
        "precipitationType": precipitation_type_label(pty),
        "sky": sky_label(sky),
        "uvIndex": {
            "areaNo": YEONGJU_AREA_NO,
            "issuedAt": clean_text(uv.get("date")),
            "current": to_int(uv.get("h0")),
            "maxNext12Hours": max_uv,
            "level": uv_level(max_uv),
        },
        "guidance": guidance,
        "source": "KmaWeatherForecast",
    }


def create_accessibility_summary(data: dict[str, Any]) -> dict[str, Any]:
    parking_lots = data.get("parkingLots", [])
    toilets = data.get("publicToilets", [])
    accessible_parking = [
        item for item in parking_lots if item.get("hasAccessibleParking")
    ]
    accessible_toilets = [
        item
        for item in toilets
        if item.get("disabledToiletCount", 0) > 0 or item.get("emergencyBell")
    ]
    return {
        "accessibleParkingLots": len(accessible_parking),
        "accessiblePublicToilets": len(accessible_toilets),
        "totalParkingLots": len(parking_lots),
        "totalPublicToilets": len(toilets),
        "guidance": [
            "부모님 동반·편의 우선 추천에서는 장애인 주차 가능 주차장과 장애인 화장실 정보를 가중합니다.",
            "좌표가 없는 편의시설은 주소 권역 대표점으로 보정해 히트맵과 추천 근거에 사용합니다.",
        ],
        "source": "BarrierFreeTourismInfo",
    }


def create_transit_access(data: dict[str, Any]) -> dict[str, Any]:
    rail_routes = data.get("railAccess", [])
    weekday_total = sum(to_int(route.get("weekdayPassengerTrainCount")) for route in rail_routes)
    weekend_total = sum(to_int(route.get("weekendPassengerTrainCount")) for route in rail_routes)
    return {
        "mainStation": {
            "title": "영주역",
            "mapX": 128.6264,
            "mapY": 36.8115,
            "address": "경상북도 영주시 선비로 64",
        },
        "weekdayPassengerTrainCount": weekday_total,
        "weekendPassengerTrainCount": weekend_total,
        "routeCount": len(rail_routes),
        "guidance": "외지 방문자는 영주역을 출발점으로 잡고 선비세상·소수서원·풍기권 숙박을 연결합니다.",
        "source": "TagoTransitOpenData",
    }


def upsert_source_inventory(
    existing: list[dict[str, Any]],
    additions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_id = {item.get("id"): item for item in existing}
    for item in additions:
        by_id[item["id"]] = item

    order = [item.get("id") for item in existing]
    for item in additions:
        if item["id"] not in order:
            order.append(item["id"])

    return [by_id[item_id] for item_id in order if item_id in by_id]


def first_forecast_time(items: list[dict[str, Any]]) -> tuple[str | None, str | None]:
    times = sorted(
        {
            (clean_text(item.get("fcstDate")), clean_text(item.get("fcstTime")))
            for item in items
            if item.get("fcstDate") and item.get("fcstTime")
        }
    )
    return times[0] if times else (None, None)


def format_forecast_time(value: tuple[str | None, str | None]) -> str | None:
    date, time = value
    if not date or not time:
        return None
    return f"{date[:4]}-{date[4:6]}-{date[6:8]} {time[:2]}:{time[2:4]}"


def precipitation_type_label(value: str) -> str:
    return {
        "0": "없음",
        "1": "비",
        "2": "비/눈",
        "3": "눈",
        "4": "소나기",
    }.get(value, "미확인")


def sky_label(value: str) -> str:
    return {"1": "맑음", "3": "구름많음", "4": "흐림"}.get(value, "미확인")


def uv_level(value: int) -> str:
    if value >= 11:
        return "위험"
    if value >= 8:
        return "매우 높음"
    if value >= 6:
        return "높음"
    if value >= 3:
        return "보통"
    return "낮음"


def coordinate_fields(address: str, title: str, index: int) -> dict[str, Any]:
    lng, lat, source = estimate_coordinates(address, title, index)
    return {"mapX": lng, "mapY": lat, "coordinateSource": source}


def estimate_coordinates(
    address: str,
    title: str,
    index: int,
) -> tuple[float, float, str]:
    text = f"{address} {title}"
    anchors: list[tuple[str, tuple[float, float], str]] = [
        ("소수서원", (128.5808, 36.9252), "known-place"),
        ("선비촌", (128.5816, 36.9237), "known-place"),
        ("선비세상", (128.5843, 36.9198), "known-place"),
        ("부석사", (128.6878, 36.9980), "known-place"),
        ("무섬", (128.6222, 36.7295), "known-place"),
        ("풍기", (128.5266, 36.8706), "address-area-centroid"),
        ("순흥", (128.5816, 36.9237), "address-area-centroid"),
        ("부석", (128.6878, 36.9980), "address-area-centroid"),
        ("문수", (128.6222, 36.7295), "address-area-centroid"),
        ("봉현", (128.5140, 36.8400), "address-area-centroid"),
        ("장수", (128.5740, 36.7700), "address-area-centroid"),
        ("평은", (128.6900, 36.7450), "address-area-centroid"),
        ("이산", (128.6720, 36.8020), "address-area-centroid"),
        ("단산", (128.6200, 36.9500), "address-area-centroid"),
        ("가흥", (128.6090, 36.8130), "address-area-centroid"),
        ("휴천", (128.6230, 36.8130), "address-area-centroid"),
        ("하망", (128.6280, 36.8250), "address-area-centroid"),
        ("상망", (128.6245, 36.8340), "address-area-centroid"),
        ("영주동", (128.6241, 36.8057), "address-area-centroid"),
        ("대학로", (128.6241, 36.8057), "address-area-centroid"),
        ("중앙로", (128.6241, 36.8057), "address-area-centroid"),
    ]
    for keyword, coordinate, source in anchors:
        if keyword in text:
            if source == "known-place":
                return round(coordinate[0], 6), round(coordinate[1], 6), source
            lng, lat = jitter_coordinate(coordinate, stable_id(text, index))
            return lng, lat, source

    lng, lat = jitter_coordinate((128.6241, 36.8057), stable_id(text, index))
    return lng, lat, "address-area-centroid"


def jitter_coordinate(coordinate: tuple[float, float], salt: str) -> tuple[float, float]:
    seed = sum(ord(char) for char in salt)
    angle = ((seed * 37) % 360) * math.pi / 180
    distance = 0.003 + ((seed % 17) / 17) * 0.012
    lng = coordinate[0] + math.cos(angle) * distance
    lat = coordinate[1] + math.sin(angle) * distance * 0.78
    return round(lng, 6), round(lat, 6)


def stable_id(value: str, fallback: int) -> str:
    text = value.strip() or str(fallback)
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).replace("\u3000", " ").strip()


def to_int(value: Any) -> int:
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return 0


def millis_to_date(value: Any) -> str | None:
    number = to_int(value)
    if number <= 0:
        return None
    return datetime.fromtimestamp(number / 1000, tz=KST).date().isoformat()


if __name__ == "__main__":
    main()
