import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import ForceGraph3D from 'react-force-graph-3d'
import type { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-3d'
import * as THREE from 'three'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import {
  loadSavedKnowledgeGraphs,
  saveKnowledgeGraph,
  type SavedKnowledgeGraph,
} from '../utils/knowledgeGraphStorage'

type KnowledgeNodeKind =
  | 'course'
  | 'user'
  | 'tag'
  | 'place'
  | 'data'
  | 'facility'
  | 'risk'
  | 'evidence'
  | 'source'

type KnowledgeLinkKind =
  | '입력됨'
  | '분석됨'
  | '추천됨'
  | '근거'
  | '보완'
  | '위험'
  | '대체'
  | '출처'
  | '연결'

type HeatmapMode = 'tourism' | 'facility' | 'festival'
type VisualState = 'normal' | 'focused' | 'related' | 'path' | 'faded'
type ServiceNodeType =
  | 'course'
  | 'user_input'
  | 'persona'
  | 'tag'
  | 'place'
  | 'public_data'
  | 'facility'
  | 'risk'
  | 'evidence'
  | 'source'
  | 'mission'
  | 'coupon'
type ServiceEdgeRelation =
  | 'analyzed_as'
  | 'recommends'
  | 'supported_by'
  | 'nearby'
  | 'has_risk'
  | 'alternative_to'
  | 'belongs_to_course'
  | 'uses_public_data'
  | 'improves'
type GraphMode = '3d' | '2d'

interface PlaceDetail {
  placeType: string
  tags: string[]
  publicDataSource: string
  aiReason: string
  accessibility: {
    parking: string
    toilet: string
    lodging: string
  }
  mapPlaceId?: string
  heatmapMode: HeatmapMode
}

interface RiskDetail {
  riskLevel: string
  affectedPlaces: string[]
  aiAlternative: string
  courseChange: string
}

interface RouteTarget {
  mapPlaceId?: string
  heatmapMode?: HeatmapMode
}

interface KnowledgeNode {
  id: string
  label: string
  kind: KnowledgeNodeKind
  stage: number
  score?: number
  source?: string
  summary: string
  evidence: string[]
  impact: string
  placeDetails?: PlaceDetail
  riskDetails?: RiskDetail
  routeTarget?: RouteTarget
}

interface KnowledgeLink {
  source: string
  target: string
  label: KnowledgeLinkKind
  strength: number
}

type SavedSeonbiGraph = SavedKnowledgeGraph<KnowledgeNode, KnowledgeLink>

interface PositionedKnowledgeNode extends KnowledgeNode {
  x?: number
  y?: number
  z?: number
}

interface KnowledgeStage {
  label: string
  shortLabel: string
  metric: string
  log: string
  status: string
}

interface PersonalizationProfile {
  input: string
  courseLabel: string
  coursePlaces: string[]
  confidence: number
  facilityRate: number
  topTagId: string
  topPlaceId: string
  facilityNodeId: string
  activeTagIds: Set<string>
  activePlaceIds: Set<string>
  activeDataIds: Set<string>
  activeFacilityIds: Set<string>
  activeRiskIds: Set<string>
  activeEvidenceIds: Set<string>
  activeCourseIds: Set<string>
  activeSourceIds: Set<string>
  graphNodeIds: Set<string>
  tagScores: Record<string, number>
  placeScores: Record<string, number>
  riskScores: Record<string, number>
  detectedSignals: string[]
  recommendationReason: string
  traceNodeIds: string[]
  traceSteps: string[]
  ragComparison: {
    before: string[]
    after: string[]
    reasons: string[]
  }
  logMessages: string[]
}

type RuntimeKnowledgeLink = Omit<KnowledgeLink, 'source' | 'target'> & {
  source: string | KnowledgeNode
  target: string | KnowledgeNode
}

type KnowledgeGraphMethods = ForceGraphMethods<
  NodeObject<KnowledgeNode>,
  LinkObject<KnowledgeNode, KnowledgeLink>
>

const nodeColors: Record<KnowledgeNodeKind, string> = {
  course: '#f3c95f',
  user: '#dffdf2',
  tag: '#f58ac7',
  place: '#65d68b',
  data: '#a58bff',
  facility: '#77d8f7',
  risk: '#f36f45',
  evidence: '#7db7ff',
  source: '#a9adb5',
}

const nodeKindLabels: Record<KnowledgeNodeKind, string> = {
  course: '추천 코스',
  user: '사용자 조건',
  tag: 'AI 태그',
  place: '관광지',
  data: '공공데이터',
  facility: '편의시설',
  risk: '리스크',
  evidence: 'AI 판단 근거',
  source: '출처',
}

const graphStages: KnowledgeStage[] = [
  {
    label: '사용자 입력 분석',
    shortLabel: '입력',
    metric: '사용자 조건 1',
    status: '분석 완료',
    log: '부모님 동반, 조용함, 역사문화 조건을 추천 시작 노드로 구조화했습니다.',
  },
  {
    label: 'AI 태그 확장',
    shortLabel: '태그',
    metric: '태그 8',
    status: '태그 추출',
    log: '사색형 선비, 역사문화, 자차, 편의 우선 등 추천 가중치 태그를 확장했습니다.',
  },
  {
    label: '공공데이터 근거 연결',
    shortLabel: '데이터',
    metric: '출처 7',
    status: '근거 연결',
    log: 'TourAPI와 영주시 축제, 소수서원 입장객, 주차장 표준데이터를 근거 노드로 연결했습니다.',
  },
  {
    label: '관광지 후보 매칭',
    shortLabel: '장소',
    metric: '관광지 8',
    status: '장소 매칭',
    log: '소수서원, 선비촌, 무섬마을 등 영주 주요 지점을 태그와 공공데이터로 매칭했습니다.',
  },
  {
    label: '코스 리스크 분석',
    shortLabel: '리스크',
    metric: '리스크 6',
    status: '리스크 탐지',
    log: '이동거리, 숙박 연계, 화장실 공백, 도보 부담 같은 코스 약점을 분리했습니다.',
  },
  {
    label: 'GraphRAG 추천 경로',
    shortLabel: '완성',
    metric: '노드 51',
    status: '추천 반영',
    log: '사용자 조건과 공공데이터 근거를 연결해 추천 경로를 시각화합니다.',
  },
]

const knowledgeNodes: KnowledgeNode[] = [
  {
    id: 'user-request',
    label: '부모님과 조용한 역사 여행',
    kind: 'user',
    stage: 0,
    score: 88,
    source: '사용자 입력',
    summary: 'AI 추천이 시작되는 입력 조건입니다.',
    evidence: ['동행자: 부모님', '분위기: 조용함', '관심사: 역사문화', '이동수단: 자차 가정'],
    impact:
      '화장실·주차장 접근성, 짧은 이동, 역사문화 적합도에 높은 가중치를 부여했습니다.',
  },
  {
    id: 'tag-contemplative',
    label: '사색형 선비',
    kind: 'tag',
    stage: 1,
    score: 94,
    source: 'AI 태그 추출',
    summary: '머무름, 산책, 조용한 관람을 선호하는 선비유형 태그입니다.',
    evidence: ['조용한 여행 표현', '서원·마을 체류 선호', '역사문화 관심사'],
    impact: '소수서원과 무섬마을의 추천 점수를 크게 올렸습니다.',
  },
  {
    id: 'tag-history',
    label: '역사문화',
    kind: 'tag',
    stage: 1,
    score: 96,
    source: 'AI 태그 추출',
    summary: '문화유산, 서원, 전통마을 후보를 우선 탐색하는 핵심 태그입니다.',
    evidence: ['역사 여행 키워드', '영주 대표 문화유산 매칭'],
    impact: '소수서원, 부석사, 선비촌 후보군을 상위로 끌어올렸습니다.',
  },
  {
    id: 'tag-parents',
    label: '부모님 동반',
    kind: 'tag',
    stage: 1,
    score: 91,
    source: 'AI 태그 추출',
    summary: '이동 피로와 편의시설을 함께 검증해야 하는 동행 조건입니다.',
    evidence: ['고령 동반 가능성', '휴식 지점 필요', '편의시설 접근성 가중'],
    impact: '주차장, 화장실, 휴식 동선 노드의 영향력을 높였습니다.',
  },
  {
    id: 'tag-calm',
    label: '조용함',
    kind: 'tag',
    stage: 1,
    score: 90,
    source: 'AI 태그 추출',
    summary: '행사 중심보다 차분한 공간과 산책 동선을 선호하는 조건입니다.',
    evidence: ['조용한 분위기', '체류형 관광 선호'],
    impact: '축제·행사 후보보다 서원·전통마을 후보를 우선했습니다.',
  },
  {
    id: 'tag-car',
    label: '자차 이동',
    kind: 'tag',
    stage: 1,
    score: 86,
    source: 'AI 태그 추출',
    summary: '장소 간 이동 가능성을 주차 접근성과 함께 평가합니다.',
    evidence: ['영주 외곽 관광지 분산', '주차장 접근성 필요'],
    impact: '주차장 데이터와 장소 간 이동거리 리스크를 동시에 연결했습니다.',
  },
  {
    id: 'tag-accessible',
    label: '편의 우선',
    kind: 'tag',
    stage: 1,
    score: 84,
    source: 'AI 태그 추출',
    summary: '추천 결과에 편의시설 검증을 반영해야 한다는 판단 태그입니다.',
    evidence: ['부모님 동반 조건', '휴식·화장실 접근성'],
    impact: '편의시설 검증률을 최종 추천 신뢰도 산식에 포함했습니다.',
  },
  {
    id: 'tag-slow',
    label: '느린 여행',
    kind: 'tag',
    stage: 1,
    score: 82,
    source: 'AI 태그 추출',
    summary: '짧은 체크인식 방문보다 천천히 둘러보는 동선을 선호합니다.',
    evidence: ['사색형 성향', '마을 산책 적합도'],
    impact: '무섬마을과 소백산 자락길의 감성 적합도를 높였습니다.',
  },
  {
    id: 'tag-family',
    label: '가족형 동선',
    kind: 'tag',
    stage: 1,
    score: 79,
    source: 'AI 태그 추출',
    summary: '세대 간 동행을 고려해 설명형 콘텐츠와 쉬운 동선을 선호합니다.',
    evidence: ['부모님 동반', '선비촌 체험 콘텐츠'],
    impact: '선비촌, 선비세상, 영주역 연결 코스를 보완 후보로 유지했습니다.',
  },
  {
    id: 'data-tourapi',
    label: 'TourAPI 관광지 데이터',
    kind: 'data',
    stage: 2,
    score: 92,
    source: '한국관광공사 TourAPI',
    summary: '관광지 명칭, 분류, 주소, 좌표를 후보 생성에 사용합니다.',
    evidence: ['관광지 좌표', '콘텐츠 타입', '주소·지역 분류'],
    impact: '장소 후보가 실제 관광 데이터에 존재하는지 검증했습니다.',
    routeTarget: { heatmapMode: 'tourism' },
  },
  {
    id: 'data-parking',
    label: '영주시 주차장 데이터 94건',
    kind: 'data',
    stage: 2,
    score: 84,
    source: '공공데이터포털',
    summary: '자차 이동 조건에서 장소별 주차 가능성을 보조합니다.',
    evidence: ['전국주차장정보표준데이터 94건 적용', '공영주차장 위치', '관광지 권역 매칭'],
    impact: '부모님 동반 코스에서 소수서원·선비촌 권역을 안정 후보로 만들었습니다.',
    routeTarget: { heatmapMode: 'facility' },
  },
  {
    id: 'data-toilet',
    label: '공중화장실 데이터',
    kind: 'data',
    stage: 2,
    score: 80,
    source: '공공데이터포털',
    summary: '장시간 산책 구간의 편의시설 공백을 확인합니다.',
    evidence: ['관광지 주변 화장실', '마을 산책 구간 보완'],
    impact: '무섬마을 후반 배치와 화장실 공백 리스크를 함께 만들었습니다.',
    routeTarget: { heatmapMode: 'facility' },
  },
  {
    id: 'data-lodging',
    label: '숙박업소 데이터',
    kind: 'data',
    stage: 2,
    score: 76,
    source: 'TourAPI·공공데이터',
    summary: '당일 코스를 1박2일로 확장할 수 있는지 평가합니다.',
    evidence: ['영주역 인근 숙박권', '풍기·부석 권역 숙박'],
    impact: '무섬마을 숙박 연계 약점과 대체 숙박 제안을 생성했습니다.',
    routeTarget: { heatmapMode: 'facility' },
  },
  {
    id: 'data-festival',
    label: '영주시 축제 데이터 6건',
    kind: 'data',
    stage: 2,
    score: 72,
    source: '영주시 문화축제 공공데이터',
    summary: '계절 행사와 동선 집중 구간을 보조 지표로 반영합니다.',
    evidence: ['영주 문화축제 6건', '행사 권역 대표 좌표', '관광 동선 보정'],
    impact: '조용한 여행 조건과 충돌하는 행사 중심 후보를 후순위로 보냈습니다.',
    routeTarget: { heatmapMode: 'festival' },
  },
  {
    id: 'source-yeongju',
    label: '영주시 공식 관광',
    kind: 'source',
    stage: 2,
    score: 88,
    source: '영주시',
    summary: '영주 대표 관광지와 권역 설명을 확인하는 공식 출처입니다.',
    evidence: ['대표 관광지 목록', '지역 관광 설명'],
    impact: '장소명과 지역 맥락의 신뢰도를 보강했습니다.',
  },
  {
    id: 'source-tourapi',
    label: '한국관광공사 TourAPI',
    kind: 'source',
    stage: 2,
    score: 90,
    source: '한국관광공사',
    summary: '관광지 좌표와 콘텐츠 타입을 제공하는 핵심 출처입니다.',
    evidence: ['관광지 좌표', '콘텐츠 분류'],
    impact: '그래프 노드가 실제 관광지 데이터에 연결되도록 했습니다.',
  },
  {
    id: 'source-data-portal',
    label: '공공데이터포털',
    kind: 'source',
    stage: 2,
    score: 86,
    source: '공공데이터포털',
    summary: '주차장, 화장실, 숙박 같은 보조 데이터를 확인하는 출처입니다.',
    evidence: ['편의시설 데이터', '공공시설 목록'],
    impact: '추천이 감성 태그만으로 끝나지 않도록 근거를 보강했습니다.',
  },
  {
    id: 'source-fallback',
    label: 'Fallback 시설 목록',
    kind: 'source',
    stage: 2,
    score: 78,
    source: '앱 로컬 데이터',
    summary: '공공데이터 로딩 실패 시 최소 시설 안내를 유지하는 보조 출처입니다.',
    evidence: ['지도·공공데이터 실패 대비', '핵심 관광지 주변 시설'],
    impact: '네트워크 실패 상황에서도 추천 설명을 유지하는 안전망 역할을 합니다.',
  },
  {
    id: 'facility-parking',
    label: '주차장 접근성',
    kind: 'facility',
    stage: 2,
    score: 88,
    source: '공공데이터포털',
    summary: '자차 이동 조건에서 추천 장소의 진입 부담을 낮추는 근거입니다.',
    evidence: ['소수서원 권역 주차', '선비촌 인접 주차', '부석사 관광 주차'],
    impact: '부모님 동반 조건에서 최종 코스 신뢰도를 높였습니다.',
    routeTarget: { heatmapMode: 'facility' },
  },
  {
    id: 'facility-toilet',
    label: '화장실 접근성',
    kind: 'facility',
    stage: 2,
    score: 82,
    source: '공공데이터포털',
    summary: '장시간 관람과 마을 산책의 부담을 줄이는 편의시설 근거입니다.',
    evidence: ['관광지 내부 화장실', '마을 주변 편의시설'],
    impact: '무섬마을 산책 구간의 리스크를 보완했습니다.',
    routeTarget: { heatmapMode: 'facility' },
  },
  {
    id: 'facility-lodging',
    label: '숙박 연계성',
    kind: 'facility',
    stage: 2,
    score: 74,
    source: 'TourAPI·공공데이터',
    summary: '당일 여행을 1박2일 코스로 바꿀 때 필요한 연결성입니다.',
    evidence: ['영주역 인근 숙박', '풍기 권역 숙박'],
    impact: '숙박 연계가 약한 후반 장소의 배치 순서를 조정했습니다.',
    routeTarget: { heatmapMode: 'facility' },
  },
  {
    id: 'facility-rest',
    label: '휴식 지점',
    kind: 'facility',
    stage: 2,
    score: 79,
    source: 'AI 추정·관광지 설명',
    summary: '부모님 동반 여행에서 중간 휴식이 가능한 권역을 찾습니다.',
    evidence: ['선비촌 체류형 공간', '소수서원 관람 후 휴식'],
    impact: '소수서원-선비촌 연계의 안정성을 높였습니다.',
  },
  {
    id: 'facility-walking',
    label: '보행 부담 완화',
    kind: 'facility',
    stage: 2,
    score: 73,
    source: 'AI 동선 평가',
    summary: '계단, 긴 산책, 경사 같은 체력 부담을 점검합니다.',
    evidence: ['부석사 도보 진입', '무섬마을 산책 구간'],
    impact: '부석사 집중 코스를 대체안으로 분리했습니다.',
  },
  {
    id: 'facility-food',
    label: '식사 접근성',
    kind: 'facility',
    stage: 2,
    score: 77,
    source: '관광 권역 정보',
    summary: '코스 중간에 식사를 연결하기 쉬운 권역을 봅니다.',
    evidence: ['영주역 주변 상권', '풍기·선비촌 권역'],
    impact: '긴 코스를 가족형 동선으로 바꿀 때 중요한 보완 근거가 됩니다.',
  },
  {
    id: 'facility-photo',
    label: '사진·풍경 포인트',
    kind: 'facility',
    stage: 2,
    score: 81,
    source: '관광지 설명',
    summary: '느린 여행 감성을 강화하는 풍경형 체류 근거입니다.',
    evidence: ['무섬마을 외나무다리', '부석사 조망'],
    impact: '무섬마을을 최종 코스 후반부에 남기는 이유가 됩니다.',
  },
  {
    id: 'facility-guide',
    label: '문화해설 접근성',
    kind: 'facility',
    stage: 2,
    score: 85,
    source: '관광지 콘텐츠',
    summary: '역사문화 여행의 이해도를 높이는 설명형 콘텐츠입니다.',
    evidence: ['소수서원 해설', '선비촌 체험 콘텐츠'],
    impact: '역사문화 태그의 만족도를 높이는 핵심 보완 근거입니다.',
  },
  {
    id: 'facility-station',
    label: '영주역 연결성',
    kind: 'facility',
    stage: 2,
    score: 78,
    source: '교통 거점',
    summary: '타지역 방문자와 숙박 연계의 기준점이 되는 교통 거점입니다.',
    evidence: ['영주역', '시내 숙박권', '렌터카·택시 접근'],
    impact: '대체 코스와 숙박 전환 제안의 기준점을 제공합니다.',
  },
  {
    id: 'place-sosu',
    label: '소수서원',
    kind: 'place',
    stage: 3,
    score: 94,
    source: 'TourAPI·소수서원 입장객 현황',
    summary: '사색형·역사문화 태그와 가장 강하게 연결되는 핵심 관광지입니다.',
    evidence: ['2014-01-01~2026-06-01 입장객 4,535일치', '누적 입장객 2,329,192명', '주차장 접근성 양호'],
    impact: '최종 코스의 첫 지점으로 확정되어 전체 추천 신뢰도를 끌어올렸습니다.',
    placeDetails: {
      placeType: '역사문화 관광지',
      tags: ['사색형 선비', '학문형 선비', '역사문화', '조용함'],
      publicDataSource: 'TourAPI 관광지 데이터, 영주시 공식 관광',
      aiReason: '부모님 동반·조용한 역사문화 조건과 가장 잘 맞는 장소입니다.',
      accessibility: {
        parking: '양호: 권역 주차장 접근성이 좋습니다.',
        toilet: '양호: 관람 동선 주변 편의시설 이용이 가능합니다.',
        lodging: '보통: 풍기·영주 시내 숙박권과 연계 가능합니다.',
      },
      mapPlaceId: 'sosu-seowon',
      heatmapMode: 'tourism',
    },
  },
  {
    id: 'place-seonbichon',
    label: '선비촌',
    kind: 'place',
    stage: 3,
    score: 90,
    source: 'TourAPI',
    summary: '소수서원과 가까워 이동 부담이 낮고 전통문화 체험을 보강합니다.',
    evidence: ['소수서원 인접', '가족형 동선', '문화해설 접근성'],
    impact: '짧은 이동으로 역사문화 몰입도를 유지하는 두 번째 지점입니다.',
    placeDetails: {
      placeType: '전통문화 마을',
      tags: ['가족형 동선', '문화해설', '전통문화'],
      publicDataSource: 'TourAPI 관광지 데이터, 영주시 공식 관광',
      aiReason: '소수서원 관람 뒤 같은 권역에서 자연스럽게 이어지는 장소입니다.',
      accessibility: {
        parking: '양호: 소수서원·선비촌 권역 주차장을 함께 이용하기 좋습니다.',
        toilet: '양호: 시설 내부 편의시설 접근이 무난합니다.',
        lodging: '보통: 풍기·영주 시내 숙박과 묶기 좋습니다.',
      },
      mapPlaceId: 'seonbichon',
      heatmapMode: 'tourism',
    },
  },
  {
    id: 'place-museom',
    label: '무섬마을',
    kind: 'place',
    stage: 3,
    score: 87,
    source: 'TourAPI',
    summary: '조용한 산책과 풍경 감상이 강해 사색형 여행 후반부에 적합합니다.',
    evidence: ['전통마을', '느린 여행', '사진·풍경 포인트'],
    impact: 'RAG 근거 반영 후 부석사 대신 최종 코스에 포함된 장소입니다.',
    placeDetails: {
      placeType: '전통마을',
      tags: ['사색형 선비', '느린 여행', '사진·풍경'],
      publicDataSource: 'TourAPI 관광지 데이터, 공공데이터포털 편의시설',
      aiReason: '차분한 풍경과 산책 동선이 조용한 역사 여행 감정과 잘 맞습니다.',
      accessibility: {
        parking: '보통: 마을 입구 주차 후 도보 이동을 권장합니다.',
        toilet: '보통: 산책 전 위치 확인이 필요합니다.',
        lodging: '주의: 마을 내 숙박보다 영주역 인근 숙박 연계가 안정적입니다.',
      },
      mapPlaceId: 'museom-village',
      heatmapMode: 'facility',
    },
  },
  {
    id: 'place-buseoksa',
    label: '부석사',
    kind: 'place',
    stage: 3,
    score: 93,
    source: 'TourAPI',
    summary: '문화유산 매력은 높지만 이동거리와 도보 부담을 함께 검토합니다.',
    evidence: ['문화유산 태그', '북부권 이동거리', '계단·도보 부담'],
    impact: '일반 추천에서는 상위였지만 RAG 리스크 반영 후 대체 코스로 이동했습니다.',
    placeDetails: {
      placeType: '사찰·문화유산',
      tags: ['역사문화', '풍경형', '문화유산'],
      publicDataSource: 'TourAPI 관광지 데이터, 영주시 공식 관광',
      aiReason: '매력도는 높지만 부모님 동반 하루 코스에서는 체력 부담이 커질 수 있습니다.',
      accessibility: {
        parking: '양호: 관광 주차장 이용 후 도보 진입이 일반적입니다.',
        toilet: '보통: 주차장과 관람 동선 주변 시설을 활용합니다.',
        lodging: '보통: 부석·풍기 권역 또는 영주 시내 숙박과 연계 가능합니다.',
      },
      mapPlaceId: 'buseoksa',
      heatmapMode: 'tourism',
    },
  },
  {
    id: 'place-seonbiworld',
    label: '선비세상',
    kind: 'place',
    stage: 3,
    score: 85,
    source: '영주시 공식 관광',
    summary: '현대적인 전시와 체험으로 선비문화 이해를 보완하는 후보입니다.',
    evidence: ['전시형 콘텐츠', '가족형 동선', '실내 편의시설'],
    impact: '날씨 변수나 체험형 요구가 강할 때 대체 코스로 전환됩니다.',
    placeDetails: {
      placeType: '복합문화 테마공간',
      tags: ['가족형 동선', '체험형', '실내 보완'],
      publicDataSource: '영주시 공식 관광, 공공 좌표 기반',
      aiReason: '전시·체험형 콘텐츠가 있어 날씨나 체력 변수를 보완할 수 있습니다.',
      accessibility: {
        parking: '양호: 대형 방문객을 고려한 주차 동선이 좋습니다.',
        toilet: '양호: 시설 내부 편의시설 이용이 쉽습니다.',
        lodging: '보통: 풍기·영주 시내 숙박지와 함께 계획하기 좋습니다.',
      },
      mapPlaceId: 'seonbi-world',
      heatmapMode: 'tourism',
    },
  },
  {
    id: 'place-station',
    label: '영주역',
    kind: 'place',
    stage: 3,
    score: 78,
    source: '교통 거점',
    summary: '숙박과 교통 연결을 잡는 기준점입니다.',
    evidence: ['시내 숙박권', '교통 접근성', '대체 코스 출발점'],
    impact: '1박2일 전환과 대체 코스 설계의 앵커 역할을 합니다.',
    placeDetails: {
      placeType: '교통 거점',
      tags: ['숙박 연계', '도시 산책', '대체 코스'],
      publicDataSource: '공공 좌표, 교통 거점 데이터',
      aiReason: '타지역 방문자에게 출발·복귀·숙박을 연결하는 기준점입니다.',
      accessibility: {
        parking: '보통: 역 주변 공영·민영 주차를 활용합니다.',
        toilet: '양호: 역사 내외 화장실 이용이 편리합니다.',
        lodging: '양호: 영주 시내 숙박권과 가장 가깝습니다.',
      },
      mapPlaceId: 'yeongju-station',
      heatmapMode: 'facility',
    },
  },
  {
    id: 'place-fungi-market',
    label: '풍기인삼시장',
    kind: 'place',
    stage: 3,
    score: 76,
    source: '지역 관광 정보',
    summary: '식사·특산물·숙박권 보완에 활용할 수 있는 생활 관광 후보입니다.',
    evidence: ['식사 접근성', '풍기권 숙박', '부모님 동반 선호 가능성'],
    impact: '코스 중 식사와 쇼핑 요구가 강할 때 보완 지점으로 들어갑니다.',
    placeDetails: {
      placeType: '전통시장',
      tags: ['식사 접근성', '특산물', '가족형 동선'],
      publicDataSource: '지역 관광 정보, 공공데이터 보조',
      aiReason: '부모님 동반 여행에서 식사와 짧은 쇼핑을 보완할 수 있습니다.',
      accessibility: {
        parking: '보통: 시장 주변 주차 동선 확인이 필요합니다.',
        toilet: '보통: 공공시설 위치 확인이 필요합니다.',
        lodging: '보통: 풍기권 숙박과 연계 가능합니다.',
      },
      heatmapMode: 'facility',
    },
  },
  {
    id: 'place-sobaeksan',
    label: '소백산 자락길',
    kind: 'place',
    stage: 3,
    score: 74,
    source: '지역 관광 정보',
    summary: '풍경형 걷기 선호가 강할 때 고려하는 자연형 후보입니다.',
    evidence: ['느린 여행', '풍경 포인트', '도보 부담 검토'],
    impact: '사색형 감성은 높지만 부모님 동반에서는 도보 부담 리스크가 큽니다.',
    placeDetails: {
      placeType: '자연 산책로',
      tags: ['느린 여행', '풍경형', '도보 코스'],
      publicDataSource: '지역 관광 정보, AI 동선 평가',
      aiReason: '풍경 감상에는 좋지만 체력 부담을 먼저 확인해야 하는 후보입니다.',
      accessibility: {
        parking: '확인 필요: 진입 지점별 차이가 큽니다.',
        toilet: '확인 필요: 구간별 편의시설 공백이 있을 수 있습니다.',
        lodging: '보통: 풍기·영주 숙박권과 연계합니다.',
      },
      heatmapMode: 'tourism',
    },
  },
  {
    id: 'risk-distance',
    label: '이동거리 부담',
    kind: 'risk',
    stage: 4,
    score: 42,
    source: 'AI 동선 분석',
    summary: '부석사와 무섬마을을 같은 날 묶으면 이동 피로가 커질 수 있습니다.',
    evidence: ['관광지 간 거리', '부모님 동반', '체류 시간 압박'],
    impact: '부석사를 최종 하루 코스에서 대체 코스로 분리했습니다.',
    riskDetails: {
      riskLevel: '높음',
      affectedPlaces: ['부석사', '무섬마을'],
      aiAlternative: '부석사는 별도 반나절 코스나 1박2일 둘째 날로 분리하는 편이 좋습니다.',
      courseChange: '최종 코스는 소수서원-선비촌-무섬마을로 압축했습니다.',
    },
  },
  {
    id: 'risk-lodging',
    label: '숙박 연계 약함',
    kind: 'risk',
    stage: 4,
    score: 35,
    source: '숙박 데이터',
    summary: '무섬마을 후반 배치 시 숙박 연결을 별도로 잡아야 합니다.',
    evidence: ['영주역 인근 숙박권', '무섬마을 후반 위치'],
    impact: '1박2일 전환 시 영주역 인근 숙박을 먼저 제안하도록 했습니다.',
    riskDetails: {
      riskLevel: '보통',
      affectedPlaces: ['무섬마을'],
      aiAlternative:
        '영주역 인근 숙박시설을 먼저 연결하거나 무섬마을은 당일치기 후반 코스로 배치합니다.',
      courseChange: '무섬마을을 마지막 체류 지점으로 두고 복귀 동선을 짧게 안내합니다.',
    },
  },
  {
    id: 'risk-toilet-gap',
    label: '편의시설 공백',
    kind: 'risk',
    stage: 4,
    score: 38,
    source: '화장실 데이터',
    summary: '마을 산책 구간에서 편의시설 위치를 사전에 확인해야 합니다.',
    evidence: ['무섬마을 산책 구간', '고령 동반 조건'],
    impact: '무섬마을 상세 안내에 화장실 위치 확인 문구를 추가합니다.',
    riskDetails: {
      riskLevel: '보통',
      affectedPlaces: ['무섬마을', '소백산 자락길'],
      aiAlternative: '산책 전 공중화장실 위치를 먼저 확인하고 체류 시간을 짧게 잡습니다.',
      courseChange: '무섬마을은 짧은 산책 중심으로 추천합니다.',
    },
  },
  {
    id: 'risk-walking',
    label: '도보·계단 부담',
    kind: 'risk',
    stage: 4,
    score: 44,
    source: 'AI 동선 평가',
    summary: '부석사와 소백산 자락길은 걷기 부담이 커질 수 있습니다.',
    evidence: ['계단 가능성', '긴 산책 구간', '부모님 동반'],
    impact: '고령 동반 하루 코스에서는 실내·평지형 대체 후보를 유지합니다.',
    riskDetails: {
      riskLevel: '높음',
      affectedPlaces: ['부석사', '소백산 자락길'],
      aiAlternative: '선비세상 또는 선비촌 체류 시간을 늘려 체력 부담을 낮춥니다.',
      courseChange: '걷기 부담이 큰 후보는 대체 코스에 남겼습니다.',
    },
  },
  {
    id: 'risk-weather',
    label: '날씨 변수',
    kind: 'risk',
    stage: 4,
    score: 30,
    source: 'AI 보정',
    summary: '야외 산책 비중이 높을 때 우천이나 폭염에 취약합니다.',
    evidence: ['무섬마을 야외 산책', '소백산 자락길'],
    impact: '선비세상 같은 실내 보완 후보를 대체 코스에 유지했습니다.',
    riskDetails: {
      riskLevel: '낮음',
      affectedPlaces: ['무섬마을', '소백산 자락길'],
      aiAlternative: '날씨가 나쁘면 선비세상-영주역 권역으로 짧게 전환합니다.',
      courseChange: '실내 보완 후보를 대체 코스에 연결했습니다.',
    },
  },
  {
    id: 'risk-time',
    label: '체류 시간 압박',
    kind: 'risk',
    stage: 4,
    score: 39,
    source: 'AI 일정 분석',
    summary: '장소를 많이 넣으면 각 지점의 역사문화 경험이 얕아질 수 있습니다.',
    evidence: ['관광지 8개 후보', '하루 코스 제약'],
    impact: '최종 추천은 3개 지점 중심으로 압축했습니다.',
    riskDetails: {
      riskLevel: '보통',
      affectedPlaces: ['부석사', '풍기인삼시장', '소백산 자락길'],
      aiAlternative: '핵심 3개 지점만 묶고 나머지는 선택형 대체 코스로 제공합니다.',
      courseChange: '소수서원-선비촌-무섬마을 중심의 설명 가능한 코스로 정리했습니다.',
    },
  },
  {
    id: 'evidence-score',
    label: '추천점수 91',
    kind: 'evidence',
    stage: 5,
    score: 91,
    source: 'AI 판단',
    summary: '태그 적합도, 공공데이터 근거, 리스크 보정을 합산한 최종 점수입니다.',
    evidence: ['태그 적합도 94', '편의 접근성 86', '리스크 보정 -8'],
    impact: '최종 코스가 충분한 근거를 가진 추천임을 수치로 보여줍니다.',
  },
  {
    id: 'evidence-fit',
    label: '코스 적합도',
    kind: 'evidence',
    stage: 5,
    score: 94,
    source: 'AI 판단',
    summary: '사용자 태그와 장소 태그의 일치도를 반영합니다.',
    evidence: ['사색형 선비', '역사문화', '가족형 동선'],
    impact: '소수서원과 선비촌을 강하게 추천하는 핵심 판단입니다.',
  },
  {
    id: 'evidence-facility',
    label: '편의시설 검증률 76%',
    kind: 'evidence',
    stage: 5,
    score: 76,
    source: '공공데이터 기반 추정',
    summary: '주차장, 화장실, 숙박 연계 근거가 얼마나 연결됐는지 보여줍니다.',
    evidence: ['주차장 접근성', '화장실 접근성', '숙박 연계성'],
    impact: '부모님 동반 조건에서 추천 신뢰도를 보강합니다.',
  },
  {
    id: 'evidence-risk-adjust',
    label: '리스크 보정 -8',
    kind: 'evidence',
    stage: 5,
    score: 72,
    source: 'AI 리스크 분석',
    summary: '이동거리와 편의시설 공백을 추천 점수에서 감점합니다.',
    evidence: ['이동거리 부담', '숙박 연계 약함', '도보 부담'],
    impact: '부석사가 일반 추천에서 후순위로 이동한 이유입니다.',
  },
  {
    id: 'evidence-rag-delta',
    label: 'RAG 반영 변경',
    kind: 'evidence',
    stage: 5,
    score: 87,
    source: 'GraphRAG 판단',
    summary: '공공데이터와 리스크 근거가 추천 결과를 어떻게 바꾸었는지 기록합니다.',
    evidence: ['일반 추천: 부석사 포함', 'RAG 후: 무섬마을 포함'],
    impact: 'AI가 근거를 반영해 추천 결과를 조정한다는 점을 보여줍니다.',
  },
  {
    id: 'evidence-source-trace',
    label: '출처 추적 가능',
    kind: 'evidence',
    stage: 5,
    score: 89,
    source: '출처 그래프',
    summary: '추천 이유가 어떤 데이터와 출처를 거쳤는지 역추적할 수 있습니다.',
    evidence: ['TourAPI', '공공데이터포털', '영주시 공식 관광'],
    impact: '심사위원이 추천 근거를 그래프에서 직접 따라갈 수 있게 합니다.',
  },
  {
    id: 'course-main',
    label: '소수서원-선비촌-무섬마을',
    kind: 'course',
    stage: 5,
    score: 91,
    source: 'AI 최종 추천',
    summary: '부모님과 조용한 역사 여행 조건에 맞춘 최종 추천 코스입니다.',
    evidence: ['소수서원', '선비촌', '무섬마을', '편의시설 검증', '리스크 보정'],
    impact: 'GraphRAG 근거 반영 후 확정된 대표 코스입니다.',
  },
  {
    id: 'course-alt-buseoksa',
    label: '부석사 집중 코스',
    kind: 'course',
    stage: 5,
    score: 84,
    source: 'AI 대체 코스',
    summary: '문화유산 몰입도가 높을 때 선택할 수 있는 대체 코스입니다.',
    evidence: ['부석사', '문화유산 태그', '도보 부담 리스크'],
    impact: '체력과 이동 시간이 충분할 때만 추천되는 대체안입니다.',
  },
  {
    id: 'course-alt-city',
    label: '영주역-선비세상 코스',
    kind: 'course',
    stage: 5,
    score: 82,
    source: 'AI 대체 코스',
    summary: '날씨나 체력 변수가 있을 때 쓰는 실내·도시권 보완 코스입니다.',
    evidence: ['영주역', '선비세상', '숙박 연계성'],
    impact: '실내 체험과 숙박 전환이 필요할 때 추천됩니다.',
  },
  {
    id: 'course-alt-nature',
    label: '소백산 자락길 코스',
    kind: 'course',
    stage: 5,
    score: 74,
    source: 'AI 대체 코스',
    summary: '풍경형 선호가 강하고 도보 부담을 감수할 때 고려하는 자연형 코스입니다.',
    evidence: ['느린 여행', '사진·풍경', '도보 부담'],
    impact: '부모님 동반 기본 추천에서는 후순위로 유지됩니다.',
  },
]

const knowledgeLinks: KnowledgeLink[] = [
  { source: 'user-request', target: 'tag-contemplative', label: '분석됨', strength: 0.95 },
  { source: 'user-request', target: 'tag-history', label: '분석됨', strength: 0.94 },
  { source: 'user-request', target: 'tag-parents', label: '분석됨', strength: 0.92 },
  { source: 'user-request', target: 'tag-calm', label: '분석됨', strength: 0.9 },
  { source: 'user-request', target: 'tag-car', label: '분석됨', strength: 0.82 },
  { source: 'user-request', target: 'tag-accessible', label: '분석됨', strength: 0.84 },
  { source: 'tag-contemplative', target: 'tag-slow', label: '연결', strength: 0.78 },
  { source: 'tag-parents', target: 'tag-family', label: '연결', strength: 0.82 },
  { source: 'tag-parents', target: 'facility-toilet', label: '보완', strength: 0.84 },
  { source: 'tag-parents', target: 'facility-rest', label: '보완', strength: 0.8 },
  { source: 'tag-car', target: 'facility-parking', label: '보완', strength: 0.9 },
  { source: 'tag-accessible', target: 'facility-lodging', label: '보완', strength: 0.74 },
  { source: 'tag-accessible', target: 'facility-walking', label: '보완', strength: 0.72 },
  { source: 'tag-history', target: 'data-tourapi', label: '근거', strength: 0.86 },
  { source: 'data-tourapi', target: 'source-tourapi', label: '출처', strength: 0.92 },
  { source: 'data-parking', target: 'source-data-portal', label: '출처', strength: 0.84 },
  { source: 'data-toilet', target: 'source-data-portal', label: '출처', strength: 0.82 },
  { source: 'data-lodging', target: 'source-data-portal', label: '출처', strength: 0.76 },
  { source: 'data-festival', target: 'source-tourapi', label: '출처', strength: 0.72 },
  { source: 'source-yeongju', target: 'data-tourapi', label: '근거', strength: 0.72 },
  { source: 'source-fallback', target: 'facility-parking', label: '보완', strength: 0.64 },
  { source: 'source-fallback', target: 'facility-toilet', label: '보완', strength: 0.62 },
  { source: 'data-tourapi', target: 'facility-parking', label: '보완', strength: 0.72 },
  { source: 'data-parking', target: 'facility-parking', label: '근거', strength: 0.86 },
  { source: 'data-toilet', target: 'facility-toilet', label: '근거', strength: 0.82 },
  { source: 'data-lodging', target: 'facility-lodging', label: '근거', strength: 0.78 },
  { source: 'data-tourapi', target: 'facility-guide', label: '근거', strength: 0.76 },
  { source: 'data-tourapi', target: 'facility-photo', label: '근거', strength: 0.7 },
  { source: 'facility-station', target: 'data-lodging', label: '보완', strength: 0.7 },
  { source: 'tag-contemplative', target: 'place-sosu', label: '추천됨', strength: 0.96 },
  { source: 'tag-history', target: 'place-sosu', label: '추천됨', strength: 0.94 },
  { source: 'tag-history', target: 'place-buseoksa', label: '추천됨', strength: 0.88 },
  { source: 'tag-calm', target: 'place-museom', label: '추천됨', strength: 0.84 },
  { source: 'tag-slow', target: 'place-museom', label: '추천됨', strength: 0.82 },
  { source: 'tag-family', target: 'place-seonbichon', label: '추천됨', strength: 0.86 },
  { source: 'tag-family', target: 'place-seonbiworld', label: '추천됨', strength: 0.72 },
  { source: 'tag-car', target: 'place-station', label: '연결', strength: 0.62 },
  { source: 'facility-food', target: 'place-fungi-market', label: '보완', strength: 0.7 },
  { source: 'facility-photo', target: 'place-sobaeksan', label: '보완', strength: 0.68 },
  { source: 'place-sosu', target: 'data-tourapi', label: '근거', strength: 0.9 },
  { source: 'place-sosu', target: 'facility-parking', label: '근거', strength: 0.82 },
  { source: 'place-sosu', target: 'facility-guide', label: '근거', strength: 0.84 },
  { source: 'place-seonbichon', target: 'place-sosu', label: '연결', strength: 0.88 },
  { source: 'place-seonbichon', target: 'facility-rest', label: '보완', strength: 0.76 },
  { source: 'place-seonbichon', target: 'facility-toilet', label: '근거', strength: 0.72 },
  { source: 'place-museom', target: 'facility-photo', label: '근거', strength: 0.82 },
  { source: 'place-museom', target: 'facility-toilet', label: '보완', strength: 0.58 },
  { source: 'place-buseoksa', target: 'facility-walking', label: '위험', strength: 0.82 },
  { source: 'place-buseoksa', target: 'facility-parking', label: '근거', strength: 0.72 },
  { source: 'place-seonbiworld', target: 'facility-rest', label: '보완', strength: 0.7 },
  { source: 'place-station', target: 'facility-station', label: '근거', strength: 0.86 },
  { source: 'place-fungi-market', target: 'facility-food', label: '근거', strength: 0.76 },
  { source: 'place-sobaeksan', target: 'facility-walking', label: '위험', strength: 0.78 },
  { source: 'place-buseoksa', target: 'risk-distance', label: '위험', strength: 0.86 },
  { source: 'place-museom', target: 'risk-lodging', label: '위험', strength: 0.7 },
  { source: 'place-museom', target: 'risk-toilet-gap', label: '위험', strength: 0.66 },
  { source: 'place-buseoksa', target: 'risk-walking', label: '위험', strength: 0.8 },
  { source: 'place-sobaeksan', target: 'risk-weather', label: '위험', strength: 0.58 },
  { source: 'place-sobaeksan', target: 'risk-time', label: '위험', strength: 0.62 },
  { source: 'risk-distance', target: 'evidence-risk-adjust', label: '근거', strength: 0.82 },
  { source: 'risk-lodging', target: 'evidence-risk-adjust', label: '근거', strength: 0.72 },
  { source: 'risk-toilet-gap', target: 'evidence-facility', label: '근거', strength: 0.7 },
  { source: 'risk-walking', target: 'evidence-risk-adjust', label: '근거', strength: 0.78 },
  { source: 'facility-parking', target: 'evidence-facility', label: '근거', strength: 0.84 },
  { source: 'facility-toilet', target: 'evidence-facility', label: '근거', strength: 0.8 },
  { source: 'facility-lodging', target: 'evidence-facility', label: '근거', strength: 0.72 },
  { source: 'tag-contemplative', target: 'evidence-fit', label: '근거', strength: 0.88 },
  { source: 'tag-history', target: 'evidence-fit', label: '근거', strength: 0.86 },
  { source: 'evidence-fit', target: 'evidence-score', label: '연결', strength: 0.86 },
  { source: 'evidence-facility', target: 'evidence-score', label: '연결', strength: 0.78 },
  { source: 'evidence-risk-adjust', target: 'evidence-score', label: '연결', strength: 0.76 },
  { source: 'evidence-source-trace', target: 'source-tourapi', label: '근거', strength: 0.76 },
  { source: 'evidence-source-trace', target: 'source-data-portal', label: '근거', strength: 0.74 },
  { source: 'evidence-rag-delta', target: 'course-main', label: '추천됨', strength: 0.84 },
  { source: 'facility-parking', target: 'course-main', label: '근거', strength: 0.9 },
  { source: 'evidence-score', target: 'course-main', label: '추천됨', strength: 0.96 },
  { source: 'place-sosu', target: 'course-main', label: '추천됨', strength: 0.92 },
  { source: 'place-seonbichon', target: 'course-main', label: '추천됨', strength: 0.88 },
  { source: 'place-museom', target: 'course-main', label: '추천됨', strength: 0.84 },
  { source: 'place-buseoksa', target: 'course-alt-buseoksa', label: '대체', strength: 0.82 },
  { source: 'place-station', target: 'course-alt-city', label: '대체', strength: 0.78 },
  { source: 'place-seonbiworld', target: 'course-alt-city', label: '대체', strength: 0.8 },
  { source: 'place-sobaeksan', target: 'course-alt-nature', label: '대체', strength: 0.74 },
]

const linkKindLabels: KnowledgeLinkKind[] = [
  '입력됨',
  '분석됨',
  '추천됨',
  '근거',
  '보완',
  '위험',
  '대체',
  '출처',
  '연결',
]

const defaultScenario = '부모님과 조용한 역사 여행을 가고 싶어요. 자차로 이동하고 화장실과 주차장이 편했으면 좋겠습니다.'
const finalGraphStageIndex = graphStages.length - 1

export function KnowledgeGraphPage() {
  const graphHostRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<KnowledgeGraphMethods | undefined>(undefined)
  const hoveredNodeIdRef = useRef<string | null>(null)
  const { width, height } = useElementSize(graphHostRef)
  const [activeStageIndex, setActiveStageIndex] = useState(finalGraphStageIndex)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState('course-main')
  const [isTraceMode, setIsTraceMode] = useState(true)
  const [scenarioInput, setScenarioInput] = useState(defaultScenario)
  const [appliedScenario, setAppliedScenario] = useState(defaultScenario)
  const [searchQuery, setSearchQuery] = useState('')
  const [nodeKindFilter, setNodeKindFilter] = useState<KnowledgeNodeKind | 'all'>('all')
  const [expandedNodes, setExpandedNodes] = useState<KnowledgeNode[]>([])
  const [expandedLinks, setExpandedLinks] = useState<KnowledgeLink[]>([])
  const [commandMessage, setCommandMessage] = useState('AI 그래프 명령을 선택하면 현재 노드 주변 근거를 확장합니다.')
  const [savedGraphs, setSavedGraphs] = useState<SavedSeonbiGraph[]>(() =>
    loadSavedKnowledgeGraphs<KnowledgeNode, KnowledgeLink>(),
  )
  const [loadedGraph, setLoadedGraph] = useState<SavedSeonbiGraph | null>(null)
  const [graphMode, setGraphMode] = useState<GraphMode>('3d')

  useEffect(() => {
    if (!isPlaying) return

    if (activeStageIndex >= finalGraphStageIndex) {
      const finishTimeoutId = window.setTimeout(() => {
        setSelectedNodeId('course-main')
        setIsTraceMode(true)
        setIsPlaying(false)
      }, 0)
      return () => window.clearTimeout(finishTimeoutId)
    }

    const timeoutId = window.setTimeout(() => {
      setActiveStageIndex((currentStage) => Math.min(currentStage + 1, finalGraphStageIndex))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [activeStageIndex, isPlaying])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedScenario(scenarioInput)
    }, 360)

    return () => window.clearTimeout(timeoutId)
  }, [scenarioInput])

  const personalizationProfile = useMemo(
    () => createPersonalizationProfile(appliedScenario),
    [appliedScenario],
  )
  const basePersonalizedNodes = useMemo(
    () => personalizeNodes(knowledgeNodes, personalizationProfile)
      .filter((node) => personalizationProfile.graphNodeIds.has(node.id)),
    [personalizationProfile],
  )
  const basePersonalizedLinks = useMemo(
    () => personalizeLinks(knowledgeLinks, personalizationProfile),
    [personalizationProfile],
  )
  const personalizedNodes = useMemo(
    () => loadedGraph?.nodes ?? mergeKnowledgeNodes(basePersonalizedNodes, expandedNodes),
    [basePersonalizedNodes, expandedNodes, loadedGraph],
  )
  const personalizedLinks = useMemo(
    () => loadedGraph?.edges ?? mergeKnowledgeLinks(basePersonalizedLinks, expandedLinks),
    [basePersonalizedLinks, expandedLinks, loadedGraph],
  )
  const visibleNodes = useMemo(
    () => personalizedNodes.filter((node) => node.stage <= activeStageIndex),
    [activeStageIndex, personalizedNodes],
  )
  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  )
  const visibleLinks = useMemo(
    () =>
      personalizedLinks.filter(
        (link) => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target),
      ),
    [personalizedLinks, visibleNodeIds],
  )
  const selectedNode =
    personalizedNodes.find((node) => node.id === selectedNodeId) ??
    visibleNodes[0] ??
    personalizedNodes[0]
  const traceNodeIdSet = useMemo(
    () => new Set(personalizationProfile.traceNodeIds),
    [personalizationProfile.traceNodeIds],
  )
  const traceLinkKeySet = useMemo(() => {
    const linkKeys = new Set<string>()
    for (let index = 0; index < personalizationProfile.traceNodeIds.length - 1; index += 1) {
      linkKeys.add(createLinkKey(
        personalizationProfile.traceNodeIds[index],
        personalizationProfile.traceNodeIds[index + 1],
      ))
    }
    return linkKeys
  }, [personalizationProfile.traceNodeIds])
  const graphData = useMemo(
    () => ({
      nodes: visibleNodes.map((node) => ({ ...node })),
      links: visibleLinks.map((link) => ({ ...link })),
    }),
    [visibleLinks, visibleNodes],
  )
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const searchMatchedNodeIds = useMemo(() => {
    if (!normalizedSearchQuery) return new Set<string>()
    return new Set(
      personalizedNodes
        .filter((node) =>
          [
            node.label,
            node.summary,
            node.source ?? '',
            node.impact,
            node.evidence.join(' '),
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearchQuery),
        )
        .map((node) => node.id),
    )
  }, [normalizedSearchQuery, personalizedNodes])
  const searchRelatedNodeIds = useMemo(() => {
    const relatedNodeIds = new Set<string>()
    if (searchMatchedNodeIds.size === 0) return relatedNodeIds
    personalizedLinks.forEach((link) => {
      if (searchMatchedNodeIds.has(link.source)) relatedNodeIds.add(link.target)
      if (searchMatchedNodeIds.has(link.target)) relatedNodeIds.add(link.source)
    })
    return relatedNodeIds
  }, [personalizedLinks, searchMatchedNodeIds])
  const indexedNodes = useMemo(
    () =>
      personalizedNodes.filter((node) => {
        const matchesKind = nodeKindFilter === 'all' || node.kind === nodeKindFilter
        const matchesSearch =
          !normalizedSearchQuery ||
          searchMatchedNodeIds.has(node.id) ||
          searchRelatedNodeIds.has(node.id)
        return matchesKind && matchesSearch
      }),
    [
      nodeKindFilter,
      normalizedSearchQuery,
      personalizedNodes,
      searchMatchedNodeIds,
      searchRelatedNodeIds,
    ],
  )
  const indexedNodeGroups = useMemo(() => groupNodesByKind(indexedNodes), [indexedNodes])
  const activeStage = graphStages[activeStageIndex]
  const visibleLogs = graphStages.slice(0, activeStageIndex + 1)
  const selectedConnectedNodeLabels = selectedNode
    ? getConnectedNodeLabels(selectedNode.id, visibleLinks, personalizedNodes)
    : []

  useEffect(() => {
    graphRef.current?.refresh?.()
  }, [isTraceMode, selectedNode?.id, traceLinkKeySet, traceNodeIdSet, visibleLinks])

  function getNodeVisualStateForId(nodeId: string) {
    if (normalizedSearchQuery && !isTraceMode) {
      if (nodeId === selectedNode?.id) return 'focused'
      if (searchMatchedNodeIds.has(nodeId)) return 'related'
      if (searchRelatedNodeIds.has(nodeId)) return 'related'
      return 'faded'
    }

    const focusedNodeId = getFocusedNodeId()
    const focusedNeighborIds = focusedNodeId
      ? getNeighborIds(focusedNodeId, visibleLinks)
      : new Set<string>()

    return getNodeVisualState({
      nodeId,
      focusedNodeId,
      focusedNeighborIds,
      isTraceMode,
      traceNodeIdSet,
    })
  }

  function getLinkVisualStateForLink(link: RuntimeKnowledgeLink) {
    if (normalizedSearchQuery && !isTraceMode) {
      const sourceId = getLinkEndpointId(link.source)
      const targetId = getLinkEndpointId(link.target)
      const touchesSearch =
        searchMatchedNodeIds.has(sourceId) ||
        searchMatchedNodeIds.has(targetId) ||
        searchRelatedNodeIds.has(sourceId) ||
        searchRelatedNodeIds.has(targetId)
      return touchesSearch ? 'related' : 'faded'
    }

    const focusedNodeId = getFocusedNodeId()
    const focusedNeighborIds = focusedNodeId
      ? getNeighborIds(focusedNodeId, visibleLinks)
      : new Set<string>()

    return getLinkVisualState({
      link,
      focusedNodeId,
      focusedNeighborIds,
      isTraceMode,
      traceLinkKeySet,
    })
  }

  function getFocusedNodeId() {
    return isTraceMode ? null : hoveredNodeIdRef.current ?? selectedNode?.id ?? null
  }

  function resetGraph() {
    setActiveStageIndex(0)
    setSelectedNodeId('user-request')
    hoveredNodeIdRef.current = null
    setIsTraceMode(false)
    setIsPlaying(true)
    setLoadedGraph(null)
  }

  function selectStage(stageIndex: number) {
    setActiveStageIndex(stageIndex)
    hoveredNodeIdRef.current = null
    setIsTraceMode(false)
    setIsPlaying(false)
  }

  function toggleTraceMode() {
    setActiveStageIndex(finalGraphStageIndex)
    setSelectedNodeId('course-main')
    hoveredNodeIdRef.current = null
    setIsPlaying(false)
    setIsTraceMode((current) => {
      const nextMode = !current
      if (nextMode) {
        window.setTimeout(() => moveCameraToNode('course-main'), 80)
      }
      return nextMode
    })
  }

  function handleScenarioChange(value: string) {
    setScenarioInput(value)
    setLoadedGraph(null)
    setExpandedNodes([])
    setExpandedLinks([])
    setIsPlaying(false)
    setIsTraceMode(true)
    setActiveStageIndex(finalGraphStageIndex)
    setSelectedNodeId('course-main')
  }

  function selectKnowledgeNode(nodeId: string, shouldMoveCamera = true) {
    setSelectedNodeId(nodeId)
    setIsTraceMode(false)
    setIsPlaying(false)
    if (!shouldMoveCamera) return

    window.setTimeout(() => moveCameraToNode(nodeId), 60)
  }

  function selectIndexedNode(nodeId: string) {
    setSelectedNodeId(nodeId)
    setIsTraceMode(false)
    setIsPlaying(false)
    hoveredNodeIdRef.current = null
    window.setTimeout(() => moveCameraToNode(nodeId), 60)
  }

  function moveCameraToNode(nodeId: string) {
    const renderedNode = graphData.nodes.find((node) => node.id === nodeId) as
      | PositionedKnowledgeNode
      | undefined
    if (
      !renderedNode ||
      typeof renderedNode.x !== 'number' ||
      typeof renderedNode.y !== 'number' ||
      typeof renderedNode.z !== 'number'
    ) {
      return
    }

    graphRef.current?.cameraPosition(
      {
        x: renderedNode.x * 1.65,
        y: renderedNode.y * 1.65,
        z: renderedNode.z * 1.65 + 80,
      },
      { x: renderedNode.x, y: renderedNode.y, z: renderedNode.z },
      950,
    )
  }

  function replayGraphGrowth() {
    setActiveStageIndex(0)
    setSelectedNodeId('user-request')
    hoveredNodeIdRef.current = null
    setIsTraceMode(false)
    setLoadedGraph(null)
    setIsPlaying(true)
    setCommandMessage('Graph Growth Replay를 시작했습니다. 입력에서 완성까지 근거망이 단계별로 확장됩니다.')
  }

  function saveCurrentGraph() {
    const nextGraphs = saveKnowledgeGraph<KnowledgeNode, KnowledgeLink>({
      title: personalizationProfile.courseLabel,
      nodes: personalizedNodes,
      edges: personalizedLinks.filter(
        (link) =>
          personalizedNodes.some((node) => node.id === link.source) &&
          personalizedNodes.some((node) => node.id === link.target),
      ),
    })
    setSavedGraphs(nextGraphs)
    setCommandMessage('현재 AI 선비길 그래프를 브라우저 저장소에 저장했습니다.')
  }

  function openSavedGraph(graph: SavedSeonbiGraph) {
    setLoadedGraph(graph)
    setScenarioInput(graph.title)
    setAppliedScenario(graph.title)
    setActiveStageIndex(finalGraphStageIndex)
    setSelectedNodeId(graph.nodes[0]?.id ?? 'user-request')
    setIsTraceMode(false)
    setIsPlaying(false)
    setCommandMessage(`${graph.title} 그래프 스냅샷을 다시 열었습니다.`)
  }

  function runAiCommand(command: 'expand' | 'risk' | 'alternative' | 'summary' | 'source') {
    if (!selectedNode) return
    if (command === 'summary') {
      setCommandMessage(
        `${selectedNode.label} 노드는 ${selectedConnectedNodeLabels.length}개 근거와 연결되어 있으며, ${personalizationProfile.courseLabel} 추천 판단에 반영됩니다.`,
      )
      return
    }
    if (command === 'source') {
      setSearchQuery(selectedNode.source ?? 'TourAPI')
      setCommandMessage('선택 노드와 관련된 출처 노드를 검색 결과로 강조했습니다.')
      return
    }

    const expansion = createMockNodeExpansion(command, selectedNode, personalizedNodes.length)
    setExpandedNodes((currentNodes) => mergeKnowledgeNodes(currentNodes, expansion.nodes))
    setExpandedLinks((currentLinks) => mergeKnowledgeLinks(currentLinks, expansion.links))
    setActiveStageIndex(finalGraphStageIndex)
    setLoadedGraph(null)
    setCommandMessage(expansion.explanation)
  }

  return (
    <AppLayout hideChatbot>
      <section className="page-section page-container knowledge-graph-page">
        <div className="knowledge-graph-heading">
          <StatusBadge>Explainable AI</StatusBadge>
          <h1>AI가 이 코스를 추천한 이유</h1>
          <p>
            사용자 조건과 공공데이터 근거를 연결해 추천 경로를 시각화합니다.
          </p>
        </div>

        <section className="knowledge-personalizer" aria-labelledby="knowledge-personalizer-title">
          <div className="knowledge-personalizer-copy">
            <StatusBadge tone="brown">Personal GraphRAG</StatusBadge>
            <h2 id="knowledge-personalizer-title">상황 입력</h2>
            <textarea
              value={scenarioInput}
              onChange={(event) => handleScenarioChange(event.currentTarget.value)}
              rows={3}
              aria-label="여행 상황 입력"
              placeholder="예: 아이와 함께 실내 체험 위주로 가고 싶어요. 비가 와도 괜찮은 코스가 좋아요."
            />
          </div>
          <div className="knowledge-personalizer-result">
            <span>개인 맞춤 추천</span>
            <strong>{personalizationProfile.courseLabel}</strong>
            <p>{personalizationProfile.recommendationReason}</p>
            <div className="knowledge-personalizer-chips" aria-label="감지된 조건">
              {personalizationProfile.detectedSignals.map((signal) => (
                <i key={signal}>{signal}</i>
              ))}
            </div>
          </div>
        </section>

        <dl className="knowledge-summary-grid" aria-label="AI 근거 그래프 요약">
          <div>
            <dt>전체 노드 수</dt>
            <dd>{personalizedNodes.length}</dd>
            <span>{personalizedLinks.length}개 관계</span>
          </div>
          <div>
            <dt>공공데이터 근거</dt>
            <dd>{countNodesByKinds(['data', 'source'], personalizedNodes)}</dd>
            <span>TourAPI·공공데이터포털</span>
          </div>
          <div>
            <dt>리스크 수</dt>
            <dd>{countNodesByKinds(['risk'], personalizedNodes)}</dd>
            <span>코스 보정 노드</span>
          </div>
          <div>
            <dt>추천 신뢰도</dt>
            <dd>{personalizationProfile.confidence}%</dd>
            <span>출처·좌표·태그 매칭</span>
          </div>
          <div>
            <dt>편의시설 검증률</dt>
            <dd>{personalizationProfile.facilityRate}%</dd>
            <span>주차장·화장실·숙박</span>
          </div>
        </dl>

        <section className="knowledge-workspace-toolbar" aria-label="그래프 워크스페이스 도구">
          <div>
            <StatusBadge tone="brown">AI 선비길 Knowledge Universe</StatusBadge>
            <strong>{loadedGraph?.title ?? personalizationProfile.courseLabel}</strong>
            <span>
              {personalizedNodes.length} nodes · {personalizedLinks.length} edges · 저장 그래프 {savedGraphs.length}개
            </span>
          </div>
          <div className="knowledge-toolbar-actions">
            <button type="button" onClick={toggleTraceMode}>
              {isTraceMode ? '전체 근거망 보기' : '추천 경로 보기'}
            </button>
            <button type="button" onClick={replayGraphGrowth}>
              AI 생성 과정 다시 보기
            </button>
            <button type="button" onClick={saveCurrentGraph}>
              저장
            </button>
            <button
              type="button"
              className="knowledge-disabled-button"
              aria-disabled="true"
              onClick={() => {
                setGraphMode('2d')
                setCommandMessage('2D 모드는 준비 중입니다. 현재는 3D 그래프 탐색을 제공합니다.')
                window.setTimeout(() => setGraphMode('3d'), 600)
              }}
            >
              {graphMode === '3d' ? '2D 전환 준비 중' : '3D로 복귀'}
            </button>
          </div>
        </section>

        <section className="knowledge-stage-panel" aria-labelledby="knowledge-stage-title">
          <div>
            <StatusBadge tone="brown">GraphRAG Flow</StatusBadge>
            <h2 id="knowledge-stage-title">{activeStage.label}</h2>
            <p>{personalizationProfile.logMessages[activeStageIndex] ?? activeStage.log}</p>
          </div>
          <div className="knowledge-stage-actions">
            <button type="button" onClick={() => setIsPlaying((current) => !current)}>
              {isPlaying ? '일시정지' : '재생'}
            </button>
            <button type="button" onClick={toggleTraceMode}>
              {isTraceMode ? '전체 근거망 보기' : '추천 경로 보기'}
            </button>
            <button type="button" onClick={resetGraph}>
              초기화
            </button>
          </div>
          <div className="knowledge-stage-tabs" aria-label="분석 단계">
            {graphStages.map((stage, index) => (
              <button
                key={stage.label}
                type="button"
                className={index === activeStageIndex ? 'active' : ''}
                aria-pressed={index === activeStageIndex}
                onClick={() => selectStage(index)}
              >
                <span>{index + 1}</span>
                {stage.shortLabel}
                <small>{getStageVisibleNodeCount(index, personalizedNodes)} nodes</small>
              </button>
            ))}
          </div>
        </section>

        <div className="knowledge-graph-layout">
          <aside className="knowledge-node-index" aria-label="노드 탐색">
            <div className="knowledge-panel-heading">
              <StatusBadge tone="neutral">Node Index</StatusBadge>
              <strong>노드 탐색</strong>
            </div>
            <label className="knowledge-node-search">
              <span>검색</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="예: 부모님, 소수서원, 주차장"
              />
            </label>
            <div className="knowledge-filter-row" aria-label="노드 타입 필터">
              <button
                type="button"
                className={nodeKindFilter === 'all' ? 'active' : ''}
                onClick={() => setNodeKindFilter('all')}
              >
                전체
              </button>
              {(['course', 'tag', 'place', 'data', 'facility', 'risk'] as KnowledgeNodeKind[]).map(
                (kind) => (
                  <button
                    type="button"
                    key={kind}
                    className={nodeKindFilter === kind ? 'active' : ''}
                    onClick={() => setNodeKindFilter(kind)}
                  >
                    {nodeKindLabels[kind]}
                  </button>
                ),
              )}
            </div>
            {searchMatchedNodeIds.size > 0 && (
              <section className="knowledge-index-group knowledge-search-results">
                <h3>검색 결과</h3>
                <ul>
                  {personalizedNodes
                    .filter((node) => searchMatchedNodeIds.has(node.id))
                    .sort((firstNode, secondNode) => {
                      const firstLabelMatch = firstNode.label.toLowerCase().includes(normalizedSearchQuery)
                      const secondLabelMatch = secondNode.label.toLowerCase().includes(normalizedSearchQuery)
                      if (firstLabelMatch !== secondLabelMatch) return firstLabelMatch ? -1 : 1
                      return (secondNode.score ?? 0) - (firstNode.score ?? 0)
                    })
                    .slice(0, 8)
                    .map((node) => (
                      <li key={`search-${node.id}`}>
                        <button
                          type="button"
                          className={node.id === selectedNode?.id ? 'active' : ''}
                          onPointerDown={() => selectIndexedNode(node.id)}
                          onClick={() => selectIndexedNode(node.id)}
                        >
                          <i style={{ background: nodeColors[node.kind] }} />
                          <span>{node.label}</span>
                          {typeof node.score === 'number' && <em>{node.score}</em>}
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            )}
            <div className="knowledge-index-groups">
              {indexedNodeGroups.map((group) => (
                <section className="knowledge-index-group" key={group.kind}>
                  <h3>{nodeKindLabels[group.kind]}</h3>
                  <ul>
                    {group.nodes.map((node) => (
                      <li key={node.id}>
                        <button
                          type="button"
                          className={node.id === selectedNode?.id ? 'active' : ''}
                          onPointerDown={() => selectIndexedNode(node.id)}
                          onClick={() => selectIndexedNode(node.id)}
                        >
                          <i style={{ background: nodeColors[node.kind] }} />
                          <span>{node.label}</span>
                          {typeof node.score === 'number' && <em>{node.score}</em>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <section className="knowledge-library-panel">
              <div className="knowledge-panel-heading">
                <StatusBadge tone="brown">Graph Library</StatusBadge>
                <strong>나의 AI 선비길 그래프</strong>
              </div>
              {savedGraphs.length > 0 ? (
                <ul>
                  {savedGraphs.map((graph) => (
                    <li key={graph.id}>
                      <button type="button" onClick={() => openSavedGraph(graph)}>
                        <strong>{graph.title}</strong>
                        <span>
                          {new Date(graph.createdAt).toLocaleDateString('ko-KR')} · 노드 {graph.nodes.length}개
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>저장된 그래프가 없습니다. 현재 추천 근거망을 저장해 다시 열 수 있습니다.</p>
              )}
            </section>
          </aside>

          <section className="knowledge-graph-scene" aria-label="3D AI 추천 근거 그래프">
            <div className="knowledge-graph-scene-header">
              <div>
                <span>3D SEONBI KNOWLEDGE GRAPH</span>
                <strong>{isTraceMode ? 'GraphRAG 추천 경로' : activeStage.label}</strong>
              </div>
              <StatusBadge tone="neutral">
                {visibleNodes.length} nodes · {visibleLinks.length} links
              </StatusBadge>
            </div>
            {isTraceMode && (
              <div className="knowledge-path-breadcrumb" aria-label="추천 경로 breadcrumb">
                {personalizationProfile.traceNodeIds.map((nodeId) => (
                  <span key={nodeId}>{getNodeLabel(nodeId, personalizedNodes)}</span>
                ))}
              </div>
            )}
            <div className="knowledge-graph-host" ref={graphHostRef}>
              {width > 0 && height > 0 && (
                <ForceGraph3D
                  graphData={graphData}
                  ref={graphRef}
                  width={width}
                  height={height}
                  backgroundColor="rgba(0,0,0,0)"
                  nodeLabel={(node) => createNodeTooltip(node as KnowledgeNode)}
                  nodeColor={(node) => {
                    const graphNode = node as KnowledgeNode
                    return getNodeColor(graphNode, getNodeVisualStateForId(graphNode.id))
                  }}
                  nodeVal={(node) => {
                    const graphNode = node as KnowledgeNode
                    return getNodeValue(graphNode, getNodeVisualStateForId(graphNode.id))
                  }}
                  nodeOpacity={0.95}
                  linkLabel={(link) => (link as RuntimeKnowledgeLink).label}
                  linkColor={(link) => {
                    const graphLink = link as RuntimeKnowledgeLink
                    return getLinkColor(graphLink, getLinkVisualStateForLink(graphLink))
                  }}
                  linkOpacity={0.62}
                  linkWidth={(link) => {
                    const graphLink = link as RuntimeKnowledgeLink
                    return getLinkWidth(graphLink, getLinkVisualStateForLink(graphLink))
                  }}
                  linkDirectionalParticles={(link) => {
                    const graphLink = link as RuntimeKnowledgeLink
                    return getLinkParticles(graphLink, getLinkVisualStateForLink(graphLink))
                  }}
                  linkDirectionalParticleWidth={(link) =>
                    getLinkParticleWidth(
                      link as RuntimeKnowledgeLink,
                      getLinkVisualStateForLink(link as RuntimeKnowledgeLink),
                    )
                  }
                  linkDirectionalParticleColor={(link) => {
                    const graphLink = link as RuntimeKnowledgeLink
                    return getLinkColor(graphLink, getLinkVisualStateForLink(graphLink))
                  }}
                  linkDirectionalParticleSpeed={(link) =>
                    0.0025 + (link as RuntimeKnowledgeLink).strength * 0.004
                  }
                  nodeThreeObject={(node: object) => {
                    const graphNode = node as KnowledgeNode
                    return createNodeLabel(graphNode, getNodeVisualStateForId(graphNode.id))
                  }}
                  nodeThreeObjectExtend
                  showNavInfo={false}
                  cooldownTicks={90}
                  enableNodeDrag={false}
                  onNodeHover={(node) => {
                    const nextNodeId = node ? (node as KnowledgeNode).id : null
                    if (hoveredNodeIdRef.current === nextNodeId) return
                    hoveredNodeIdRef.current = nextNodeId
                    graphRef.current?.refresh?.()
                  }}
                  onNodeClick={(node) => {
                    selectKnowledgeNode((node as KnowledgeNode).id, false)
                  }}
                />
              )}
            </div>
            {isTraceMode && (
              <div className="knowledge-trace-overlay" aria-label="AI 추천 경로">
                <strong>AI 추천 경로</strong>
                <span>{personalizationProfile.traceNodeIds.map((nodeId) => getNodeLabel(nodeId, personalizedNodes)).join(' → ')}</span>
              </div>
            )}
            <details className="knowledge-graph-legend" open>
              <summary>범례</summary>
              <div>
                {(['course', 'user', 'tag', 'place', 'data', 'facility', 'risk'] as KnowledgeNodeKind[]).map((kind) => (
                  <span key={kind}>
                    <i style={{ backgroundColor: nodeColors[kind] }} />
                    {nodeKindLabels[kind]}
                  </span>
                ))}
              </div>
            </details>
          </section>

          <aside className="knowledge-side-panel" aria-label="AI 근거 상세">
            <section className="knowledge-node-detail" aria-live="polite">
              <div className="knowledge-node-detail-head">
                <StatusBadge>{selectedNode ? nodeKindLabels[selectedNode.kind] : '노드'}</StatusBadge>
                {selectedNode?.score && <strong>{selectedNode.score}</strong>}
              </div>
              <h2>{selectedNode?.label}</h2>
              <p>{selectedNode?.summary}</p>

              {selectedNode?.score && (
                <div
                  className="knowledge-score-bar"
                  aria-label={`${selectedNode.label} 점수 ${selectedNode.score}점`}
                >
                  <span style={{ width: `${Math.min(100, selectedNode.score)}%` }} />
                </div>
              )}

              <dl className="knowledge-node-source">
                <div>
                  <dt>노드 타입</dt>
                  <dd>
                    {selectedNode ? nodeKindLabels[selectedNode.kind] : '-'}
                    {selectedNode && ` · ${getServiceNodeType(selectedNode.kind)}`}
                  </dd>
                </div>
                {selectedNode?.source && (
                  <div>
                    <dt>출처</dt>
                    <dd>{selectedNode.source}</dd>
                  </div>
                )}
                {selectedConnectedNodeLabels.length > 0 && (
                  <div>
                    <dt>연결된 노드</dt>
                    <dd>{selectedConnectedNodeLabels.join(' · ')}</dd>
                  </div>
                )}
                {selectedNode?.impact && (
                  <div>
                    <dt>추천에 미친 영향</dt>
                    <dd>{selectedNode.impact}</dd>
                  </div>
                )}
              </dl>

              {selectedNode?.kind === 'place' && selectedNode.placeDetails && (
                <PlaceEvidenceCard
                  node={selectedNode}
                  details={selectedNode.placeDetails}
                  evidenceCount={selectedConnectedNodeLabels.length}
                />
              )}

              {selectedNode?.kind === 'risk' && selectedNode.riskDetails && (
                <RiskEvidenceCard details={selectedNode.riskDetails} />
              )}

              {selectedNode?.kind !== 'place' && selectedNode?.kind !== 'risk' && (
                <ul className="knowledge-evidence-list" aria-label="AI 설명과 근거">
                  {selectedNode?.evidence.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}

              {selectedNode?.routeTarget?.heatmapMode && selectedNode.kind !== 'place' && (
                <div className="knowledge-detail-actions">
                  <Link to={`/heatmap?mode=${selectedNode.routeTarget.heatmapMode}`}>
                    히트맵에서 보기
                  </Link>
                </div>
              )}
            </section>

            <section className="knowledge-ai-commands">
              <div className="knowledge-panel-heading">
                <StatusBadge tone="brown">AI Commands</StatusBadge>
                <strong>그래프 확장 명령</strong>
              </div>
              <div className="knowledge-ai-command-grid">
                <button type="button" onClick={() => runAiCommand('expand')}>
                  관련 근거 확장
                </button>
                <button type="button" onClick={() => runAiCommand('risk')}>
                  리스크 찾기
                </button>
                <button type="button" onClick={() => runAiCommand('alternative')}>
                  대체 코스 생성
                </button>
                <button type="button" onClick={() => runAiCommand('summary')}>
                  그래프 요약
                </button>
                <button type="button" onClick={() => runAiCommand('source')}>
                  출처 보기
                </button>
              </div>
              <p className="knowledge-command-message">{commandMessage}</p>
            </section>

            <section className="knowledge-schema-card">
              <StatusBadge tone="neutral">Graph JSON</StatusBadge>
              <dl>
                <div>
                  <dt>node.type</dt>
                  <dd>{selectedNode ? getServiceNodeType(selectedNode.kind) : 'user_input'}</dd>
                </div>
                <div>
                  <dt>edge.relation</dt>
                  <dd>
                    {visibleLinks
                      .filter((link) => link.source === selectedNode?.id || link.target === selectedNode?.id)
                      .slice(0, 3)
                      .map((link) => getServiceEdgeRelation(link.label))
                      .join(' · ') || 'supported_by'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="knowledge-side-legend" aria-label="노드 색상 범례">
              <div>
                <StatusBadge tone="neutral">범례</StatusBadge>
                <strong>노드 타입</strong>
              </div>
              <ul>
                {(
                  [
                    'course',
                    'user',
                    'tag',
                    'place',
                    'data',
                    'facility',
                    'risk',
                    'evidence',
                    'source',
                  ] as KnowledgeNodeKind[]
                ).map((kind) => (
                  <li key={kind}>
                    <i style={{ background: nodeColors[kind] }} />
                    {nodeKindLabels[kind]}
                  </li>
                ))}
              </ul>
              <div className="knowledge-link-legend">
                {linkKindLabels
                  .filter((kind) => kind !== '입력됨')
                  .map((kind) => (
                    <span key={kind} style={{ borderColor: getLinkLegendColor(kind) }}>
                      {kind}
                    </span>
                  ))}
              </div>
            </section>

            {isTraceMode && (
              <section className="knowledge-trace-panel">
                <StatusBadge>추천 경로 추적</StatusBadge>
                <ol>
                  {personalizationProfile.traceSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            )}

            <section className="knowledge-rag-compare">
              <StatusBadge tone="brown">Before / After RAG</StatusBadge>
              <div className="knowledge-rag-routes">
                <div>
                  <strong>일반 추천</strong>
                  <span>{personalizationProfile.ragComparison.before.join(' → ')}</span>
                </div>
                <div>
                  <strong>RAG 근거 반영 후</strong>
                  <span>{personalizationProfile.ragComparison.after.join(' → ')}</span>
                </div>
              </div>
              <ul>
                {personalizationProfile.ragComparison.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </section>

            <section className="knowledge-log-panel">
              <StatusBadge tone="brown">AI 근거 로그</StatusBadge>
              <ol>
                {visibleLogs.map((stage, index) => (
                  <li key={stage.label}>
                    <span>{index + 1}</span>
                    <p>
                      <strong>[{stage.status}]</strong>
                      {personalizationProfile.logMessages[index] ?? stage.log}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </section>
    </AppLayout>
  )
}

function PlaceEvidenceCard({
  node,
  details,
  evidenceCount,
}: {
  node: KnowledgeNode
  details: PlaceDetail
  evidenceCount: number
}) {
  const mapTarget = details.mapPlaceId
    ? `/tour-3d?place=${details.mapPlaceId}`
    : '/tour-3d'

  return (
    <div className="knowledge-place-detail">
      <dl>
        <div>
          <dt>유형</dt>
          <dd>{details.placeType}</dd>
        </div>
        <div>
          <dt>추천 점수</dt>
          <dd>{node.score ?? '-'}점</dd>
        </div>
        <div>
          <dt>공공데이터 출처</dt>
          <dd>{details.publicDataSource}</dd>
        </div>
        <div>
          <dt>연결된 근거 수</dt>
          <dd>{evidenceCount}개</dd>
        </div>
      </dl>
      <div className="knowledge-chip-list" aria-label="연결된 태그">
        {details.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="knowledge-ai-reason">
        <strong>AI 추천 이유</strong>
        <p>{details.aiReason}</p>
      </div>
      <ul className="knowledge-access-list">
        <li>
          <span>주차장</span>
          {details.accessibility.parking}
        </li>
        <li>
          <span>화장실</span>
          {details.accessibility.toilet}
        </li>
        <li>
          <span>숙박</span>
          {details.accessibility.lodging}
        </li>
      </ul>
      <div className="knowledge-detail-actions">
        <Link to={mapTarget}>3D 지도에서 보기</Link>
        <Link to={`/heatmap?mode=${details.heatmapMode}`}>히트맵에서 보기</Link>
      </div>
    </div>
  )
}

function RiskEvidenceCard({ details }: { details: RiskDetail }) {
  return (
    <div className="knowledge-risk-detail">
      <dl>
        <div>
          <dt>위험도</dt>
          <dd>{details.riskLevel}</dd>
        </div>
        <div>
          <dt>영향 장소</dt>
          <dd>{details.affectedPlaces.join(' · ')}</dd>
        </div>
      </dl>
      <div className="knowledge-ai-reason knowledge-ai-reason--risk">
        <strong>AI 대안 제안</strong>
        <p>{details.aiAlternative}</p>
      </div>
      <div className="knowledge-ai-reason">
        <strong>코스 변경 제안</strong>
        <p>{details.courseChange}</p>
      </div>
    </div>
  )
}

function createPersonalizationProfile(rawInput: string): PersonalizationProfile {
  const input = rawInput.trim() || defaultScenario
  const normalizedInput = input.toLowerCase()
  const activeTagIds = new Set<string>()
  const activeDataIds = new Set<string>(['data-tourapi'])
  const activeFacilityIds = new Set<string>()
  const activeEvidenceIds = new Set<string>([
    'evidence-score',
    'evidence-fit',
    'evidence-rag-delta',
    'evidence-source-trace',
  ])
  const activeCourseIds = new Set<string>(['course-main'])
  const activeSourceIds = new Set<string>(['source-tourapi', 'source-yeongju'])
  const detectedSignals: string[] = []
  const tagScores: Record<string, number> = {}
  const placeScores: Record<string, number> = {
    'place-sosu': 82,
    'place-seonbichon': 80,
    'place-museom': 78,
    'place-buseoksa': 79,
    'place-seonbiworld': 76,
    'place-station': 72,
    'place-fungi-market': 70,
    'place-sobaeksan': 68,
  }
  const riskScores: Record<string, number> = {
    'risk-distance': 34,
    'risk-lodging': 30,
    'risk-toilet-gap': 30,
    'risk-walking': 32,
    'risk-weather': 24,
    'risk-time': 28,
  }

  const hasParents = hasAnyKeyword(normalizedInput, [
    '부모',
    '엄마',
    '아빠',
    '어머니',
    '아버지',
    '어르신',
    '할머니',
    '할아버지',
    '시니어',
  ])
  const hasChildren = hasAnyKeyword(normalizedInput, ['아이', '초등', '유아', '어린이', '가족'])
  const hasQuiet = hasAnyKeyword(normalizedInput, ['조용', '한적', '사색', '힐링', '쉬고', '휴식'])
  const hasHistory = hasAnyKeyword(normalizedInput, ['역사', '문화', '유산', '선비', '서원', '전통'])
  const hasCar = hasAnyKeyword(normalizedInput, [
    '자차',
    '자동차',
    '차량',
    '렌터카',
    '렌트카',
    '운전',
    '주차',
    '차로 이동',
    '차 타고',
  ])
  const hasTransit = hasAnyKeyword(normalizedInput, ['기차', '버스', '대중교통', '뚜벅', '영주역'])
  const hasLodging = hasAnyKeyword(normalizedInput, ['숙박', '1박', '일박', '호텔', '펜션', '밤'])
  const hasNature = hasAnyKeyword(normalizedInput, ['자연', '산', '소백산', '풍경', '걷', '트레킹'])
  const hasIndoor = hasAnyKeyword(normalizedInput, ['실내', '비', '우천', '더위', '추위', '전시'])
  const hasFood = hasAnyKeyword(normalizedInput, ['맛집', '식사', '시장', '인삼', '먹거리'])
  const hasFestival = hasAnyKeyword(normalizedInput, ['축제', '행사', '공연'])
  const hasPhoto = hasAnyKeyword(normalizedInput, ['사진', '감성', '풍경', '인생샷'])

  if (hasParents) {
    addSignal(detectedSignals, '부모님 동반')
    activeTagIds.add('tag-parents')
    activeTagIds.add('tag-accessible')
    activeFacilityIds.add('facility-toilet')
    activeFacilityIds.add('facility-rest')
    activeDataIds.add('data-toilet')
    activeSourceIds.add('source-data-portal')
    activeSourceIds.add('source-fallback')
    riskScores['risk-walking'] += 14
    riskScores['risk-time'] += 8
  }

  if (hasChildren) {
    addSignal(detectedSignals, '가족형 동선')
    activeTagIds.add('tag-family')
    activeFacilityIds.add('facility-rest')
    activeFacilityIds.add('facility-guide')
    activeCourseIds.add('course-alt-city')
    placeScores['place-seonbiworld'] += 18
    placeScores['place-seonbichon'] += 12
  }

  if (hasQuiet) {
    addSignal(detectedSignals, '조용함')
    activeTagIds.add('tag-calm')
    activeTagIds.add('tag-contemplative')
    activeTagIds.add('tag-slow')
    activeFacilityIds.add('facility-photo')
    placeScores['place-museom'] += 16
    placeScores['place-sosu'] += 12
  }

  if (hasHistory) {
    addSignal(detectedSignals, '역사문화')
    activeTagIds.add('tag-history')
    activeTagIds.add('tag-contemplative')
    activeFacilityIds.add('facility-guide')
    activeCourseIds.add('course-alt-buseoksa')
    placeScores['place-sosu'] += 16
    placeScores['place-buseoksa'] += 13
    placeScores['place-seonbichon'] += 10
  }

  if (hasCar) {
    addSignal(detectedSignals, '자차 이동')
    activeTagIds.add('tag-car')
    activeFacilityIds.add('facility-parking')
    activeDataIds.add('data-parking')
    activeSourceIds.add('source-data-portal')
    placeScores['place-sosu'] += 8
    placeScores['place-seonbichon'] += 7
  }

  if (hasTransit) {
    addSignal(detectedSignals, '대중교통')
    activeTagIds.add('tag-accessible')
    activeFacilityIds.add('facility-station')
    activeDataIds.add('data-lodging')
    activeCourseIds.add('course-alt-city')
    activeSourceIds.add('source-data-portal')
    placeScores['place-station'] += 18
    placeScores['place-seonbiworld'] += 10
    riskScores['risk-distance'] += 10
  }

  if (hasLodging) {
    addSignal(detectedSignals, '숙박 연계')
    activeTagIds.add('tag-accessible')
    activeFacilityIds.add('facility-lodging')
    activeFacilityIds.add('facility-station')
    activeDataIds.add('data-lodging')
    activeCourseIds.add('course-alt-city')
    activeSourceIds.add('source-data-portal')
    placeScores['place-station'] += 12
    riskScores['risk-lodging'] += 16
  }

  if (hasNature) {
    addSignal(detectedSignals, '자연·풍경')
    activeTagIds.add('tag-slow')
    activeFacilityIds.add('facility-photo')
    activeFacilityIds.add('facility-walking')
    activeCourseIds.add('course-alt-nature')
    placeScores['place-sobaeksan'] += 20
    placeScores['place-buseoksa'] += 14
    placeScores['place-museom'] += 10
    riskScores['risk-walking'] += 16
    riskScores['risk-weather'] += 8
  }

  if (hasIndoor) {
    addSignal(detectedSignals, '실내 보완')
    activeTagIds.add('tag-family')
    activeFacilityIds.add('facility-rest')
    activeCourseIds.add('course-alt-city')
    activeSourceIds.add('source-fallback')
    placeScores['place-seonbiworld'] += 20
    riskScores['risk-weather'] += 18
  }

  if (hasFood) {
    addSignal(detectedSignals, '식사 접근성')
    activeTagIds.add('tag-accessible')
    activeFacilityIds.add('facility-food')
    activeCourseIds.add('course-alt-city')
    placeScores['place-fungi-market'] += 20
    placeScores['place-station'] += 8
  }

  if (hasFestival) {
    addSignal(detectedSignals, '축제·행사')
    activeFacilityIds.add('facility-station')
    activeDataIds.add('data-festival')
    activeCourseIds.add('course-alt-city')
    placeScores['place-seonbiworld'] += 10
    placeScores['place-station'] += 12
  }

  if (hasPhoto) {
    addSignal(detectedSignals, '사진·풍경')
    activeFacilityIds.add('facility-photo')
    activeCourseIds.add('course-alt-nature')
    placeScores['place-museom'] += 14
    placeScores['place-buseoksa'] += 10
  }

  if (detectedSignals.length === 0) {
    detectedSignals.push('사색형 선비', '역사문화')
    activeTagIds.add('tag-contemplative')
    activeTagIds.add('tag-history')
    activeFacilityIds.add('facility-parking')
    activeDataIds.add('data-parking')
    activeCourseIds.add('course-alt-buseoksa')
    activeSourceIds.add('source-data-portal')
    placeScores['place-sosu'] += 14
    placeScores['place-seonbichon'] += 10
    placeScores['place-museom'] += 8
  }

  if (activeFacilityIds.size > 0) activeEvidenceIds.add('evidence-facility')

  activeTagIds.forEach((tagId) => {
    tagScores[tagId] = getBaseNodeScore(tagId) + 8
  })

  let courseLabel = '소수서원-선비촌-무섬마을'
  let coursePlaces = ['소수서원', '선비촌', '무섬마을']
  let recommendationReason = '조용한 역사문화 조건과 편의시설 검증을 함께 반영했습니다.'
  let topTagId = hasParents ? 'tag-parents' : 'tag-contemplative'
  let topPlaceId = 'place-sosu'
  let facilityNodeId = hasCar ? 'facility-parking' : 'facility-toilet'

  if ((hasIndoor || hasChildren) && !hasNature) {
    courseLabel = '선비세상-선비촌-소수서원'
    coursePlaces = ['선비세상', '선비촌', '소수서원']
    recommendationReason = '실내 체험과 가족형 동선을 우선해 날씨와 체력 변수를 낮췄습니다.'
    topTagId = 'tag-family'
    topPlaceId = 'place-seonbiworld'
    facilityNodeId = 'facility-rest'
  } else if (hasNature && !hasParents && !hasChildren) {
    courseLabel = '부석사-소백산 자락길-무섬마을'
    coursePlaces = ['부석사', '소백산 자락길', '무섬마을']
    recommendationReason = '풍경 감상과 걷기 선호를 반영하되 도보 부담 리스크를 함께 표시했습니다.'
    topTagId = hasHistory ? 'tag-history' : 'tag-slow'
    topPlaceId = hasHistory ? 'place-buseoksa' : 'place-sobaeksan'
    facilityNodeId = 'facility-walking'
  } else if (hasFood || hasLodging || hasTransit) {
    courseLabel = '영주역-풍기인삼시장-소수서원'
    coursePlaces = ['영주역', '풍기인삼시장', '소수서원']
    recommendationReason = '교통·숙박·식사 접근성을 먼저 잡고 역사문화 지점을 연결했습니다.'
    topTagId = 'tag-accessible'
    topPlaceId = hasFood ? 'place-fungi-market' : 'place-station'
    facilityNodeId = hasFood ? 'facility-food' : 'facility-station'
  } else if (hasFestival) {
    courseLabel = '영주역-선비세상-소수서원'
    coursePlaces = ['영주역', '선비세상', '소수서원']
    recommendationReason = '축제·행사 동선과 영주역 연결성을 반영해 이동 기준점을 앞에 배치했습니다.'
    topTagId = 'tag-family'
    topPlaceId = 'place-station'
    facilityNodeId = 'facility-station'
  }

  coursePlaces.forEach((placeName) => {
    const placeId = getPlaceIdByLabel(placeName)
    if (placeId) placeScores[placeId] += 10
  })

  const activePlaceIds = new Set(
    Object.entries(placeScores)
      .sort(([, firstScore], [, secondScore]) => secondScore - firstScore)
      .slice(0, 4)
      .map(([placeId]) => placeId),
  )
  activePlaceIds.add(topPlaceId)
  const activeRiskIds = new Set(
    Object.entries(riskScores)
      .sort(([, firstScore], [, secondScore]) => secondScore - firstScore)
      .slice(0, 3)
      .map(([riskId]) => riskId),
  )
  if (activeRiskIds.size > 0) activeEvidenceIds.add('evidence-risk-adjust')

  const confidence = clamp(80 + activeTagIds.size * 2 + activeFacilityIds.size * 2 - activeRiskIds.size, 78, 94)
  const facilityRate = clamp(68 + activeFacilityIds.size * 5 + (hasCar ? 4 : 0), 70, 92)

  if (activeFacilityIds.has('facility-parking')) {
    activeDataIds.add('data-parking')
    activeSourceIds.add('source-data-portal')
  }
  if (activeFacilityIds.has('facility-toilet')) {
    activeDataIds.add('data-toilet')
    activeSourceIds.add('source-data-portal')
  }
  if (activeFacilityIds.has('facility-lodging') || activeFacilityIds.has('facility-station')) {
    activeDataIds.add('data-lodging')
    activeSourceIds.add('source-data-portal')
  }
  if (activeFacilityIds.has('facility-guide') || activeFacilityIds.has('facility-photo')) {
    activeDataIds.add('data-tourapi')
  }

  const graphNodeIds = createPersonalizedGraphNodeIds({
    activeTagIds,
    activePlaceIds,
    activeDataIds,
    activeFacilityIds,
    activeRiskIds,
    activeEvidenceIds,
    activeCourseIds,
    activeSourceIds,
    traceNodeIds: ['user-request', topTagId, topPlaceId, 'data-tourapi', facilityNodeId, 'course-main'],
  })

  return {
    input,
    courseLabel,
    coursePlaces,
    confidence,
    facilityRate,
    topTagId,
    topPlaceId,
    facilityNodeId,
    activeTagIds,
    activePlaceIds,
    activeDataIds,
    activeFacilityIds,
    activeRiskIds,
    activeEvidenceIds,
    activeCourseIds,
    activeSourceIds,
    graphNodeIds,
    tagScores,
    placeScores,
    riskScores,
    detectedSignals,
    recommendationReason,
    traceNodeIds: ['user-request', topTagId, topPlaceId, 'data-tourapi', facilityNodeId, 'course-main'],
    traceSteps: [
      `사용자가 "${input}" 조건을 입력`,
      `${detectedSignals.slice(0, 3).join('·')} 조건을 AI 태그로 추출`,
      `${getNodeLabel(topPlaceId, knowledgeNodes)} 노드의 추천 점수를 상향`,
      'TourAPI와 공공데이터 출처로 장소 근거를 확인',
      `${getNodeLabel(facilityNodeId, knowledgeNodes)} 노드를 편의 검증 근거로 연결`,
      `${courseLabel} 코스를 개인 맞춤 추천으로 확정`,
    ],
    ragComparison: {
      before: ['소수서원', '선비촌', '부석사'],
      after: coursePlaces,
      reasons: [
        `${detectedSignals[0]} 조건 때문에 관련 태그와 장소 점수가 변경됐습니다.`,
        `${getNodeLabel(facilityNodeId, knowledgeNodes)} 근거를 추천 신뢰도에 반영했습니다.`,
        '리스크 노드를 함께 계산해 최종 코스 순서를 조정했습니다.',
      ],
    },
    logMessages: [
      `사용자 입력에서 ${detectedSignals.slice(0, 3).join('·')} 조건을 추출했습니다.`,
      `${activeTagIds.size}개 개인화 태그를 활성화했습니다.`,
      `공공데이터와 편의시설 근거 ${activeFacilityIds.size + 2}건을 연결했습니다.`,
      `${coursePlaces.join('·')} 후보를 우선 장소로 재정렬했습니다.`,
      `${activeRiskIds.size}개 리스크를 추천 점수에 반영했습니다.`,
      `${courseLabel} 코스를 개인 맞춤 추천으로 생성했습니다.`,
    ],
  }
}

function personalizeNodes(
  nodes: KnowledgeNode[],
  profile: PersonalizationProfile,
): KnowledgeNode[] {
  return nodes.map((node) => {
    if (node.id === 'user-request') {
      return {
        ...node,
        label: profile.input.length > 28 ? `${profile.input.slice(0, 28)}...` : profile.input,
        score: profile.confidence,
        summary: '사용자가 입력한 현재 여행 상황입니다.',
        evidence: profile.detectedSignals.map((signal) => `감지 조건: ${signal}`),
        impact: `${profile.courseLabel} 추천을 생성하는 기준 입력으로 반영됐습니다.`,
      }
    }

    if (node.id === 'course-main') {
      return {
        ...node,
        label: profile.courseLabel,
        score: profile.confidence,
        summary: profile.recommendationReason,
        evidence: [
          ...profile.coursePlaces,
          `${profile.detectedSignals.slice(0, 3).join('·')} 조건 반영`,
          `추천 신뢰도 ${profile.confidence}%`,
        ],
        impact: '사용자 입력에 따라 실시간으로 재구성된 최종 추천 코스입니다.',
      }
    }

    if (node.id === 'evidence-score') {
      return {
        ...node,
        label: `추천점수 ${profile.confidence}`,
        score: profile.confidence,
        summary: `${profile.detectedSignals.join(', ')} 조건을 반영한 개인화 추천 점수입니다.`,
      }
    }

    if (node.id === 'evidence-facility') {
      return {
        ...node,
        label: `편의시설 검증률 ${profile.facilityRate}%`,
        score: profile.facilityRate,
      }
    }

    if (profile.tagScores[node.id]) {
      return {
        ...node,
        score: clamp(profile.tagScores[node.id], 0, 99),
        evidence: [...node.evidence, '사용자 입력에서 활성화'],
        impact: `${profile.courseLabel} 추천에 직접 반영된 개인화 태그입니다.`,
      }
    }

    if (profile.placeScores[node.id]) {
      const score = clamp(profile.placeScores[node.id], 0, 99)
      return {
        ...node,
        score,
        summary: profile.activePlaceIds.has(node.id)
          ? `${profile.input} 조건과 매칭되어 우선 후보로 재정렬된 장소입니다.`
          : node.summary,
        impact: profile.activePlaceIds.has(node.id)
          ? `${profile.courseLabel} 추천 후보군에서 ${score}점으로 재평가됐습니다.`
          : node.impact,
        placeDetails: node.placeDetails
          ? {
              ...node.placeDetails,
              aiReason: profile.activePlaceIds.has(node.id)
                ? `${profile.detectedSignals.join('·')} 조건과 연결되어 개인 맞춤 후보로 올라왔습니다.`
                : node.placeDetails.aiReason,
            }
          : undefined,
      }
    }

    if (profile.riskScores[node.id]) {
      const score = clamp(profile.riskScores[node.id], 0, 99)
      return {
        ...node,
        score,
        impact: profile.activeRiskIds.has(node.id)
          ? `${profile.courseLabel} 추천에서 반드시 확인해야 하는 리스크로 반영됐습니다.`
          : node.impact,
      }
    }

    if (profile.activeFacilityIds.has(node.id)) {
      return {
        ...node,
        score: clamp((node.score ?? 76) + 8, 0, 99),
        evidence: [...node.evidence, '개인 입력 기반 편의 검증'],
        impact: `${profile.detectedSignals.join('·')} 조건을 보완하는 핵심 편의시설 근거입니다.`,
      }
    }

    return node
  })
}

function personalizeLinks(
  links: KnowledgeLink[],
  profile: PersonalizationProfile,
): KnowledgeLink[] {
  const personalizedLinks = links.map((link) => {
    const isActiveSource =
      profile.activeTagIds.has(link.source) ||
      profile.activePlaceIds.has(link.source) ||
      profile.activeFacilityIds.has(link.source) ||
      profile.activeRiskIds.has(link.source)
    const isActiveTarget =
      profile.activeTagIds.has(link.target) ||
      profile.activePlaceIds.has(link.target) ||
      profile.activeFacilityIds.has(link.target) ||
      profile.activeRiskIds.has(link.target)

    return {
      ...link,
      strength: isActiveSource || isActiveTarget ? clamp(link.strength + 0.12, 0, 1) : link.strength,
    }
  })

  addPersonalizedLink(personalizedLinks, 'user-request', profile.topTagId, '분석됨', 0.96)
  addPersonalizedLink(personalizedLinks, profile.topTagId, profile.topPlaceId, '추천됨', 0.94)
  addPersonalizedLink(personalizedLinks, profile.topPlaceId, 'data-tourapi', '근거', 0.88)
  addPersonalizedLink(personalizedLinks, profile.topPlaceId, profile.facilityNodeId, '보완', 0.86)
  addPersonalizedLink(personalizedLinks, profile.facilityNodeId, 'course-main', '근거', 0.9)
  addPersonalizedLink(personalizedLinks, profile.topPlaceId, 'course-main', '추천됨', 0.92)

  return personalizedLinks
}

function createPersonalizedGraphNodeIds({
  activeTagIds,
  activePlaceIds,
  activeDataIds,
  activeFacilityIds,
  activeRiskIds,
  activeEvidenceIds,
  activeCourseIds,
  activeSourceIds,
  traceNodeIds,
}: {
  activeTagIds: Set<string>
  activePlaceIds: Set<string>
  activeDataIds: Set<string>
  activeFacilityIds: Set<string>
  activeRiskIds: Set<string>
  activeEvidenceIds: Set<string>
  activeCourseIds: Set<string>
  activeSourceIds: Set<string>
  traceNodeIds: string[]
}) {
  const graphNodeIds = new Set<string>(['user-request'])
  const addIds = (ids: Iterable<string>) => {
    Array.from(ids).forEach((id) => graphNodeIds.add(id))
  }

  addIds(activeTagIds)
  addIds(activePlaceIds)
  addIds(activeDataIds)
  addIds(activeFacilityIds)
  addIds(activeRiskIds)
  addIds(activeEvidenceIds)
  addIds(activeCourseIds)
  addIds(activeSourceIds)
  addIds(traceNodeIds)

  return graphNodeIds
}

function addPersonalizedLink(
  links: KnowledgeLink[],
  source: string,
  target: string,
  label: KnowledgeLinkKind,
  strength: number,
) {
  if (links.some((link) => link.source === source && link.target === target)) return
  links.push({ source, target, label, strength })
}

function hasAnyKeyword(input: string, keywords: string[]) {
  return keywords.some((keyword) => input.includes(keyword))
}

function addSignal(signals: string[], signal: string) {
  if (!signals.includes(signal)) signals.push(signal)
}

function getBaseNodeScore(nodeId: string) {
  return knowledgeNodes.find((node) => node.id === nodeId)?.score ?? 76
}

function getPlaceIdByLabel(placeLabel: string) {
  return knowledgeNodes.find((node) => node.kind === 'place' && node.label === placeLabel)?.id
}

function mergeKnowledgeNodes(baseNodes: KnowledgeNode[], nextNodes: KnowledgeNode[]) {
  const nodeMap = new Map<string, KnowledgeNode>()
  baseNodes.forEach((node) => nodeMap.set(node.id, node))
  nextNodes.forEach((node) => nodeMap.set(node.id, node))
  return Array.from(nodeMap.values())
}

function mergeKnowledgeLinks(baseLinks: KnowledgeLink[], nextLinks: KnowledgeLink[]) {
  const linkMap = new Map<string, KnowledgeLink>()
  baseLinks.forEach((link) => linkMap.set(`${link.source}-${link.target}-${link.label}`, link))
  nextLinks.forEach((link) => linkMap.set(`${link.source}-${link.target}-${link.label}`, link))
  return Array.from(linkMap.values())
}

function groupNodesByKind(nodes: KnowledgeNode[]) {
  const orderedKinds: KnowledgeNodeKind[] = [
    'course',
    'user',
    'tag',
    'place',
    'data',
    'facility',
    'risk',
    'evidence',
    'source',
  ]

  return orderedKinds
    .map((kind) => ({
      kind,
      nodes: nodes
        .filter((node) => node.kind === kind)
        .sort((firstNode, secondNode) => (secondNode.score ?? 0) - (firstNode.score ?? 0)),
    }))
    .filter((group) => group.nodes.length > 0)
}

function getServiceNodeType(kind: KnowledgeNodeKind): ServiceNodeType {
  const kindMap: Record<KnowledgeNodeKind, ServiceNodeType> = {
    course: 'course',
    user: 'user_input',
    tag: 'tag',
    place: 'place',
    data: 'public_data',
    facility: 'facility',
    risk: 'risk',
    evidence: 'evidence',
    source: 'source',
  }
  return kindMap[kind]
}

function getServiceEdgeRelation(kind: KnowledgeLinkKind): ServiceEdgeRelation {
  const relationMap: Record<KnowledgeLinkKind, ServiceEdgeRelation> = {
    입력됨: 'analyzed_as',
    분석됨: 'analyzed_as',
    추천됨: 'recommends',
    근거: 'supported_by',
    보완: 'improves',
    위험: 'has_risk',
    대체: 'alternative_to',
    출처: 'uses_public_data',
    연결: 'nearby',
  }
  return relationMap[kind]
}

function createMockNodeExpansion(
  command: 'expand' | 'risk' | 'alternative',
  selectedNode: KnowledgeNode,
  nodeCount: number,
) {
  const suffix = `${selectedNode.id}-${command}-${nodeCount}`

  if (command === 'risk') {
    const riskNode: KnowledgeNode = {
      id: `${suffix}-risk`,
      label: `${selectedNode.label} 보정 리스크`,
      kind: 'risk',
      stage: 4,
      score: 64,
      source: 'AI 리스크 분석',
      summary: '선택 노드 주변에서 추가 확인이 필요한 이동·편의 리스크입니다.',
      evidence: ['공공데이터 기반 추정', '추천 동선 보정 필요'],
      impact: '최종 코스 순서와 대체 코스 제안에 반영됩니다.',
      riskDetails: {
        riskLevel: '보통',
        affectedPlaces: [selectedNode.label],
        aiAlternative: '해당 지점 전후에 휴식 또는 교통 거점을 배치합니다.',
        courseChange: '무리한 연속 이동을 줄이고 인접 장소를 먼저 연결합니다.',
      },
    }

    return {
      nodes: [riskNode],
      links: [
        { source: selectedNode.id, target: riskNode.id, label: '위험', strength: 0.78 },
        { source: riskNode.id, target: 'evidence-risk-adjust', label: '근거', strength: 0.72 },
      ] as KnowledgeLink[],
      explanation: `${selectedNode.label} 주변 리스크 노드를 추가했습니다.`,
    }
  }

  if (command === 'alternative') {
    const courseNode: KnowledgeNode = {
      id: `${suffix}-course`,
      label: `${selectedNode.label} 대체 코스`,
      kind: 'course',
      stage: 5,
      score: 76,
      source: 'AI 대체 코스 생성',
      summary: '선택 노드의 조건을 유지하면서 부담을 낮춘 대체 추천입니다.',
      evidence: ['선택 노드 조건 유지', '리스크 회피', '공공데이터 기반 추정'],
      impact: '원 코스가 날씨·이동 조건과 맞지 않을 때 대안으로 제시됩니다.',
    }

    return {
      nodes: [courseNode],
      links: [
        { source: selectedNode.id, target: courseNode.id, label: '대체', strength: 0.82 },
        { source: courseNode.id, target: 'course-main', label: '보완', strength: 0.68 },
      ] as KnowledgeLink[],
      explanation: `${selectedNode.label} 기준 대체 코스를 생성했습니다.`,
    }
  }

  const evidenceNode: KnowledgeNode = {
    id: `${suffix}-evidence`,
    label: `${selectedNode.label} 추가 근거`,
    kind: 'evidence',
    stage: Math.max(2, selectedNode.stage),
    score: 82,
    source: 'AI 근거 확장',
    summary: '선택 노드와 연결된 공공데이터·태그·장소 맥락을 추가로 구조화했습니다.',
    evidence: ['관련 태그 재검토', '공공데이터 기반 추정', 'GraphRAG 추천 경로 확장'],
    impact: '선택 노드의 추천 신뢰도를 보강하고 연결 설명을 늘립니다.',
  }
  const sourceNode: KnowledgeNode = {
    id: `${suffix}-source`,
    label: `${selectedNode.label} 출처 메모`,
    kind: 'source',
    stage: 2,
    score: 78,
    source: 'AI Data Sidebar',
    summary: '추후 API 연결 시 원문 문서와 공공데이터 링크를 붙일 출처 노드입니다.',
    evidence: ['Graph JSON schema placeholder', 'sourceUrl 연결 예정'],
    impact: 'AI가 생성한 노드의 출처 추적성을 높입니다.',
  }

  return {
    nodes: [evidenceNode, sourceNode],
    links: [
      { source: selectedNode.id, target: evidenceNode.id, label: '근거', strength: 0.84 },
      { source: evidenceNode.id, target: sourceNode.id, label: '출처', strength: 0.72 },
    ] as KnowledgeLink[],
    explanation: `${selectedNode.label} 주변에 관련 근거와 출처 메모 노드를 추가했습니다.`,
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    function updateSize() {
      const rect = element?.getBoundingClientRect()
      if (!rect) return

      setSize({
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(420, Math.round(rect.height)),
      })
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [ref])

  return size
}

function countNodesByKinds(kinds: KnowledgeNodeKind[], nodes: KnowledgeNode[] = knowledgeNodes) {
  return nodes.filter((node) => kinds.includes(node.kind)).length
}

function getStageVisibleNodeCount(stageIndex: number, nodes: KnowledgeNode[] = knowledgeNodes) {
  return nodes.filter((node) => node.stage <= stageIndex).length
}

function getNeighborIds(nodeId: string, links: KnowledgeLink[]) {
  const neighborIds = new Set<string>()
  links.forEach((link) => {
    if (link.source === nodeId) neighborIds.add(link.target)
    if (link.target === nodeId) neighborIds.add(link.source)
  })
  return neighborIds
}

function getConnectedNodeLabels(
  nodeId: string,
  links: KnowledgeLink[],
  nodes: KnowledgeNode[] = knowledgeNodes,
) {
  const labels = links
    .flatMap((link) => {
      if (link.source === nodeId) return [getNodeLabel(link.target, nodes)]
      if (link.target === nodeId) return [getNodeLabel(link.source, nodes)]
      return []
    })
    .filter(Boolean)

  return [...new Set(labels)].slice(0, 7)
}

function getNodeLabel(nodeId: string, nodes: KnowledgeNode[] = knowledgeNodes) {
  return nodes.find((node) => node.id === nodeId)?.label ?? ''
}

function getNodeVisualState({
  nodeId,
  focusedNodeId,
  focusedNeighborIds,
  isTraceMode,
  traceNodeIdSet,
}: {
  nodeId: string
  focusedNodeId: string | null
  focusedNeighborIds: Set<string>
  isTraceMode: boolean
  traceNodeIdSet: Set<string>
}): VisualState {
  if (isTraceMode) return traceNodeIdSet.has(nodeId) ? 'path' : 'faded'
  if (!focusedNodeId) return 'normal'
  if (nodeId === focusedNodeId) return 'focused'
  if (focusedNeighborIds.has(nodeId)) return 'related'
  return 'faded'
}

function getLinkVisualState({
  link,
  focusedNodeId,
  focusedNeighborIds,
  isTraceMode,
  traceLinkKeySet,
}: {
  link: RuntimeKnowledgeLink
  focusedNodeId: string | null
  focusedNeighborIds: Set<string>
  isTraceMode: boolean
  traceLinkKeySet: Set<string>
}): VisualState {
  const sourceId = getLinkEndpointId(link.source)
  const targetId = getLinkEndpointId(link.target)
  const linkKey = createLinkKey(sourceId, targetId)
  if (isTraceMode) return traceLinkKeySet.has(linkKey) ? 'path' : 'faded'
  if (!focusedNodeId) return 'normal'
  const touchesFocusedNode =
    sourceId === focusedNodeId ||
    targetId === focusedNodeId ||
    focusedNeighborIds.has(sourceId) ||
    focusedNeighborIds.has(targetId)

  return touchesFocusedNode ? 'related' : 'faded'
}

function getLinkEndpointId(endpoint: string | KnowledgeNode) {
  return typeof endpoint === 'string' ? endpoint : endpoint.id
}

function createLinkKey(source: string, target: string) {
  return `${source}->${target}`
}

function getNodeValue(node: KnowledgeNode, visualState: VisualState) {
  const visualBonus = visualState === 'focused' || visualState === 'path' ? 1.45 : 1
  if (node.id === 'course-main') return 58 * visualBonus
  if (node.kind === 'course') return 28 * visualBonus
  if (node.kind === 'evidence') return 14 * visualBonus
  if (node.kind === 'user') return 13 * visualBonus
  if (node.score) return Math.max(6, node.score / 9) * visualBonus
  return 7 * visualBonus
}

function getNodeColor(node: KnowledgeNode, visualState: VisualState) {
  if (visualState === 'faded') return '#28302f'
  if (visualState === 'path') return '#fff2a8'
  return nodeColors[node.kind]
}

function getLinkColor(link: RuntimeKnowledgeLink, visualState: VisualState) {
  if (visualState === 'faded') return 'rgba(123, 132, 129, 0.22)'
  if (visualState === 'path') return 'rgba(255, 232, 138, 0.96)'
  if (link.label === '위험') return 'rgba(243, 111, 69, 0.9)'
  if (link.label === '근거') return 'rgba(125, 216, 247, 0.88)'
  if (link.label === '추천됨') return 'rgba(101, 214, 139, 0.9)'
  if (link.label === '대체') return 'rgba(243, 201, 95, 0.84)'
  if (link.label === '보완') return 'rgba(165, 139, 255, 0.82)'
  return 'rgba(246, 243, 242, 0.7)'
}

function getLinkLegendColor(kind: KnowledgeLinkKind) {
  if (kind === '위험') return '#f36f45'
  if (kind === '근거') return '#77d8f7'
  if (kind === '추천됨') return '#65d68b'
  if (kind === '대체') return '#f3c95f'
  if (kind === '보완') return '#a58bff'
  return '#d8d0c5'
}

function getLinkWidth(link: RuntimeKnowledgeLink, visualState: VisualState) {
  if (visualState === 'path') return 5.4
  if (visualState === 'related') return 2.6
  if (visualState === 'faded') return 0.35
  if (link.label === '위험') return 1.2 + link.strength * 2.2
  return 0.7 + link.strength * 1.8
}

function getLinkParticles(link: RuntimeKnowledgeLink, visualState: VisualState) {
  if (visualState === 'path') return 8
  if (visualState === 'related') return 2
  if (visualState === 'faded') return 0
  return link.label === '추천됨' || link.label === '근거' ? 1 : 0
}

function getLinkParticleWidth(link: RuntimeKnowledgeLink, visualState: VisualState) {
  if (visualState === 'path') return 3.4
  if (visualState === 'related') return 1.9
  if (link.label === '위험') return 2.4
  return 0.9 + link.strength * 1.5
}

function createNodeTooltip(node: KnowledgeNode) {
  return `${node.label} | ${nodeKindLabels[node.kind]}${
    node.score ? ` | ${node.score}점` : ''
  }`
}

function createNodeLabel(node: KnowledgeNode, visualState: VisualState) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const label = node.label
  const fontSize = node.id === 'course-main' ? 40 : node.kind === 'course' ? 34 : 28
  const icon = getNodeIconLabel(node.kind)
  const paddingX = 36
  const paddingY = node.id === 'course-main' ? 24 : 16
  const scale = 2
  const isDimmed = visualState === 'faded'
  const isHighlighted = visualState === 'focused' || visualState === 'path'
  const isMainCourse = node.id === 'course-main'

  canvas.width = 560
  canvas.height = 176

  if (!context) return new THREE.Object3D()

  context.scale(scale, scale)
  context.font = `800 ${fontSize / scale}px Manrope, sans-serif`
  const measuredWidth = context.measureText(label).width
  const boxWidth = Math.max(isMainCourse ? 152 : 112, Math.min(270, measuredWidth + paddingX + 24))
  const boxHeight = isMainCourse ? 52 : 38 + paddingY / 2
  const color = isMainCourse ? '#f3c95f' : isHighlighted ? '#fff2a8' : nodeColors[node.kind]

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.globalAlpha = isDimmed ? 0.38 : 1
  if (isMainCourse) {
    context.shadowColor = '#f3c95f'
    context.shadowBlur = 26
    context.strokeStyle = 'rgba(243, 201, 95, 0.36)'
    context.lineWidth = 3
    context.beginPath()
    context.ellipse(boxWidth / 2, boxHeight / 2 + 8, boxWidth / 2 + 20, boxHeight / 2 + 14, 0, 0, Math.PI * 2)
    context.stroke()
  }

  context.shadowColor = isHighlighted || isMainCourse ? color : 'transparent'
  context.shadowBlur = isHighlighted || isMainCourse ? 18 : 0
  context.fillStyle = isHighlighted ? 'rgba(29, 31, 22, 0.9)' : 'rgba(5, 7, 13, 0.78)'
  roundRect(context, 0, 5, boxWidth, boxHeight, 7)
  context.fill()
  context.shadowBlur = 0
  context.strokeStyle = color
  context.lineWidth = isHighlighted ? 2.2 : 1.4
  roundRect(context, 0.7, 5.7, boxWidth - 1.4, boxHeight - 1.4, 7)
  context.stroke()
  context.fillStyle = color
  context.beginPath()
  context.arc(17, boxHeight / 2 + 5, isHighlighted || isMainCourse ? 6.2 : 4.8, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = isDimmed ? 'rgba(5, 7, 13, 0.72)' : '#07100d'
  context.font = '900 7px Manrope, sans-serif'
  context.textAlign = 'center'
  context.fillText(icon, 17, boxHeight / 2 + 7.5)
  context.textAlign = 'start'
  context.fillStyle = isDimmed ? 'rgba(248, 250, 252, 0.64)' : '#f8fafc'
  context.fillText(label, 33, isMainCourse ? 34 : 28)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: isDimmed ? 0.46 : 1,
  })
  const sprite = new THREE.Sprite(material)
  const scaleFactor = isMainCourse ? 0.18 : isHighlighted ? 0.145 : 0.12
  sprite.scale.set(boxWidth * scaleFactor, boxHeight * scaleFactor, 1)
  sprite.position.set(0, isMainCourse ? 33 : node.kind === 'course' ? 21 : 13, 0)

  return sprite
}

function getNodeIconLabel(kind: KnowledgeNodeKind) {
  if (kind === 'course') return 'GO'
  if (kind === 'user') return 'ME'
  if (kind === 'tag') return 'TAG'
  if (kind === 'place') return 'PIN'
  if (kind === 'data') return 'DB'
  if (kind === 'facility') return 'OK'
  if (kind === 'risk') return '!'
  if (kind === 'evidence') return 'AI'
  return 'SRC'
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const right = x + width
  const bottom = y + height

  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(right - radius, y)
  context.quadraticCurveTo(right, y, right, y + radius)
  context.lineTo(right, bottom - radius)
  context.quadraticCurveTo(right, bottom, right - radius, bottom)
  context.lineTo(x + radius, bottom)
  context.quadraticCurveTo(x, bottom, x, bottom - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}
