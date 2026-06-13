import type { SeonbiType } from '../seonbi-test/types'
import type { RecommendedCourse, TourismContent } from './tourismTypes'

export interface CourseMindTags {
  emotionTag?: string
  situationTag?: string
  adviceTag?: string
}

const keywordsByType: Record<SeonbiType, string[]> = {
  toegye: ['서원', '문화유산', '학문', '전통', '조용한'],
  yulgok: ['체험', '시장', '실용', '가족', '도시'],
  cheosa: ['자연', '산책', '마을', '강', '산', '숲'],
  uguk: ['역사', '문화유산', '기념', '교육', '의미', '장소'],
}

const contentTypeWeightsByType: Record<SeonbiType, Record<string, number>> = {
  toegye: { '14': 3, '12': 2 },
  yulgok: { '12': 2, '39': 2 },
  cheosa: { '12': 2 },
  uguk: { '14': 3, '12': 2 },
}

const recommendationLimit = 6

export function recommendCourseForSeonbiType(
  seonbiType: SeonbiType,
  contents: TourismContent[],
  mindTags?: CourseMindTags | null,
): RecommendedCourse {
  if (contents.length === 0) {
    return {
      seonbiType,
      items: [],
      reason: 'no_data',
    }
  }

  const keywords = keywordsByType[seonbiType]
  const contentTypeWeights = contentTypeWeightsByType[seonbiType]
  const scoredContents = contents
    .map((content, index) => {
      const keywordScore = scoreTourismContent(content, keywords)
      const contentTypeScore = content.contentTypeId
        ? contentTypeWeights[content.contentTypeId] ?? 0
        : 0
      const mindTagScore = scoreTourismContentByMindTags(content, mindTags)
      const localDataScore = scoreTourismContentByLocalData(
        content,
        seonbiType,
        mindTags,
      )

      return {
        content,
        index,
        totalScore: keywordScore + contentTypeScore + mindTagScore + localDataScore,
        mindTagScore,
        hasImage: Boolean(content.firstImage || content.firstImage2),
        hasCoordinates: content.mapX !== undefined && content.mapY !== undefined,
        hasAddress: Boolean(content.address),
      }
    })
    .sort((a, b) => {
      return (
        b.totalScore - a.totalScore ||
        b.mindTagScore - a.mindTagScore ||
        Number(b.hasImage) - Number(a.hasImage) ||
        Number(b.hasCoordinates) - Number(a.hasCoordinates) ||
        Number(b.hasAddress) - Number(a.hasAddress) ||
        a.index - b.index
      )
    })

  return {
    seonbiType,
    items: scoredContents
      .slice(0, recommendationLimit)
      .map((item) => item.content),
  }
}

export function createTourismRecommendationReason(
  seonbiType: SeonbiType | undefined,
  content: TourismContent,
  mindTags?: CourseMindTags | null,
) {
  const subject = getContentReasonSubject(content)
  const localDataReason = createLocalDataRecommendationReason(content, subject)

  if (hasMindTags(mindTags)) {
    const mindTagReason = createMindTagRecommendationReason(content, mindTags)
    return localDataReason ? `${mindTagReason} ${localDataReason}` : mindTagReason
  }

  if (localDataReason) {
    return localDataReason
  }

  if (isRestaurant(content)) {
    return `${subject}에서 여행 중 잠시 쉬어가며 지역의 맛을 경험하기 좋습니다.`
  }

  if (isAccommodation(content)) {
    return `${subject}은 하루의 여정을 차분히 마무리하기 좋은 머무름의 장소입니다.`
  }

  if (!seonbiType) {
    return createCategoryBasedRecommendationReason(content)
  }

  if (seonbiType === 'toegye') {
    if (isCultureOrHistoryContent(content)) {
      return `${subject}의 역사와 이야기가 차분한 배움과 성찰을 중시하는 퇴계형에게 잘 맞습니다.`
    }
    if (isNatureOrVillageContent(content)) {
      return `${subject}에서 조용히 머물며 생각을 정리하기 좋아 퇴계형에게 어울립니다.`
    }
    return `${subject}은 여행 중에도 의미를 차분히 살피기 좋은 퇴계형 추천 장소입니다.`
  }

  if (seonbiType === 'yulgok') {
    if (isRestaurant(content)) {
      return `${subject}에서 지역의 맛을 빠르게 경험하며 다음 동선을 이어가기 좋아 율곡형에게 잘 맞습니다.`
    }
    if (isAccommodation(content)) {
      return `${subject}은 다음 일정을 준비하며 하루를 정리하기 좋은 율곡형 머무름입니다.`
    }
    return `${subject}은 직접 보고 움직이는 경험을 중시하는 율곡형에게 알맞은 코스입니다.`
  }

  if (seonbiType === 'cheosa') {
    if (isNatureOrVillageContent(content)) {
      return `${subject}의 풍경은 속도를 낮추고 쉬어가기 좋아 처사형에게 특히 어울립니다.`
    }
    if (isAccommodation(content)) {
      return `${subject}은 조용히 머물며 여정을 비우기 좋은 처사형 숙소 후보입니다.`
    }
    return `${subject}은 여유와 쉼의 리듬을 살려 둘러보기 좋은 처사형 여행지입니다.`
  }

  if (isCultureOrHistoryContent(content)) {
    return `${subject}에서 영주의 역사와 책임의 가치를 돌아보기 좋아 우국형에게 추천합니다.`
  }
  if (isNatureOrVillageContent(content)) {
    return `${subject}을 걸으며 공동체와 삶의 터전을 생각해보기 좋은 우국형 코스입니다.`
  }
  return `${subject}은 의미 있는 이동과 실천의 감각을 더하기 좋은 우국형 추천 장소입니다.`
}

function scoreTourismContent(content: TourismContent, keywords: string[]) {
  const searchableText = [
    content.title,
    content.address,
    content.overview,
    content.category,
  ]
    .filter(Boolean)
    .join(' ')

  return keywords.reduce((score, keyword) => {
    return searchableText.includes(keyword) ? score + 1 : score
  }, 0)
}

function scoreTourismContentByMindTags(
  content: TourismContent,
  mindTags: CourseMindTags | null | undefined,
) {
  if (!hasMindTags(mindTags)) return 0

  const emotionTag = mindTags.emotionTag ?? ''
  const situationTag = mindTags.situationTag ?? ''
  const adviceTag = mindTags.adviceTag ?? ''
  const searchableText = getContentSearchableText(content)
  let score = 0

  if (
    hasAnyTagValue(emotionTag, ['걱정', '막막함', '막막', '불안']) &&
    (isCultureOrHistoryContent(content) ||
      searchableText.includes('소수서원') ||
      searchableText.includes('부석사'))
  ) {
    score += 8
  }

  if (
    hasAnyTagValue(situationTag, ['진로', '학업', '공부']) &&
    (searchableText.includes('소수서원') ||
      searchableText.includes('선비세상') ||
      searchableText.includes('서원'))
  ) {
    score += 8
  }

  if (
    (hasAnyTagValue(emotionTag, ['피로', '평온', '지침']) ||
      hasAnyTagValue(situationTag, ['휴식', '쉼'])) &&
    (isAccommodation(content) ||
      isNatureOrVillageContent(content) ||
      searchableText.includes('무섬마을'))
  ) {
    score += 8
  }

  if (
    hasAnyTagValue(adviceTag, ['실천', '행동']) &&
    (content.contentTypeId === '12' ||
      searchableText.includes('선비세상') ||
      searchableText.includes('체험'))
  ) {
    score += 6
  }

  if (
    hasAnyTagValue(adviceTag, ['응원', '칭찬', '격려']) &&
    (isRestaurant(content) || searchableText.includes('풍기인삼시장'))
  ) {
    score += 5
  }

  return score
}

function scoreTourismContentByLocalData(
  content: TourismContent,
  seonbiType: SeonbiType,
  mindTags: CourseMindTags | null | undefined,
) {
  const searchableText = getContentSearchableText(content)
  let score = 0

  if (content.source === 'SosuVisitorStats') score += 12
  if (content.source === 'YeongjuOfficialFestival') score += 9
  if (content.source === 'YeongjuRuralTourismOpenData') score += 7
  if (content.source === 'YeongjuRuralHomestayOpenData') score += 6
  if (content.source === 'YeongjuSafeRestaurantOpenData') score += 6
  if (content.source === 'YeongjuGoodRestaurantOpenData') score += 4

  if (content.coordinateSource === 'known-place') score += 2
  if (content.parkingCapacity) score += 2
  if (content.roomCount && content.roomCount >= 4) score += 2

  if (seonbiType === 'yulgok' && isRestaurant(content)) score += 5
  if (seonbiType === 'cheosa' && isAccommodation(content)) score += 5
  if (seonbiType === 'toegye' && searchableText.includes('서원')) score += 4
  if (seonbiType === 'uguk' && isCultureOrHistoryContent(content)) score += 4

  if (
    hasMindTags(mindTags) &&
    (hasAnyTagValue(mindTags.situationTag ?? '', ['부모', '가족', '동반']) ||
      hasAnyTagValue(mindTags.adviceTag ?? '', ['응원', '칭찬', '격려'])) &&
    content.source === 'YeongjuSafeRestaurantOpenData'
  ) {
    score += 5
  }

  if (
    hasMindTags(mindTags) &&
    (hasAnyTagValue(mindTags.situationTag ?? '', ['휴식', '쉼']) ||
      hasAnyTagValue(mindTags.emotionTag ?? '', ['피로', '지침'])) &&
    content.source === 'YeongjuRuralHomestayOpenData'
  ) {
    score += 5
  }

  return score
}

function createMindTagRecommendationReason(
  content: TourismContent,
  mindTags: CourseMindTags,
) {
  const tagFlow = formatMindTagFlow(mindTags)
  const subject = getContentReasonSubject(content)
  if (isRestaurant(content)) {
    return `최근 읽어낸 마음인 '${tagFlow}' 흐름에 맞춰 ${subject}에서 쉬어가며 기운을 채우기 좋습니다.`
  }

  if (isAccommodation(content)) {
    return `최근 읽어낸 마음인 '${tagFlow}' 흐름에 맞춰 ${subject}에서 하루를 차분히 정리하기 좋습니다.`
  }

  if (isNatureOrVillageContent(content)) {
    return `최근 읽어낸 마음인 '${tagFlow}' 흐름에 맞춰 ${subject}에서 천천히 숨을 고르기 좋습니다.`
  }

  if (isCultureOrHistoryContent(content)) {
    return `최근 읽어낸 마음인 '${tagFlow}' 흐름에 맞춰 ${subject}의 이야기를 보며 생각을 정리하기 좋습니다.`
  }

  return `최근 읽어낸 마음인 '${tagFlow}' 흐름에 맞춰 ${subject}을 추천합니다.`
}

function createCategoryBasedRecommendationReason(content: TourismContent) {
  const subject = getContentReasonSubject(content)
  if (isCultureOrHistoryContent(content)) {
    return `${subject}에서 영주의 역사와 문화를 차분히 살펴보기 좋습니다.`
  }

  if (isNatureOrVillageContent(content)) {
    return `${subject}은 자연과 마을의 분위기를 천천히 느끼기 좋은 여행지입니다.`
  }

  return `${subject}은 영주 여행의 흐름에 자연스럽게 더하기 좋은 추천 장소입니다.`
}

function createLocalDataRecommendationReason(
  content: TourismContent,
  subject: string,
) {
  if (content.source === 'SosuVisitorStats') {
    const evidence = content.dataEvidence?.[0]
    return `${subject}은 실제 입장객 추이 데이터${evidence ? `(${evidence})` : ''}로 확인되는 영주 대표 역사문화 거점입니다.`
  }

  if (content.source === 'YeongjuFestivalOpenData') {
    const period = content.eventPeriod ? ` ${content.eventPeriod} 일정의` : ''
    return `${subject}은 영주시 문화축제 데이터에 포함된${period} 행사라 계절형 동선 후보로 참고하기 좋습니다.`
  }

  if (content.source === 'YeongjuOfficialFestival') {
    const period = content.eventPeriod ? ` ${content.eventPeriod}` : ''
    return `${subject}은 공식 축제 안내에서 확인한${period} 핵심 행사라 선비문화 테마 여행의 기준점으로 쓰기 좋습니다.`
  }

  if (content.source === 'YeongjuGoodRestaurantOpenData') {
    return `${subject}은 영주시 맛집 현황에 등록된 지역 음식점이라 관광 동선 중 식사 후보로 연결하기 좋습니다.`
  }

  if (content.source === 'YeongjuSafeRestaurantOpenData') {
    return `${subject}은 안심식당 데이터에 포함되어 가족 동반 식사나 쉬어가는 일정에 우선 검토하기 좋습니다.`
  }

  if (content.source === 'YeongjuRuralTourismOpenData') {
    return `${subject}은 영주시 농촌관광시설 데이터에 포함되어 체험·자연·마을형 동선 보강에 적합합니다.`
  }

  if (content.source === 'YeongjuRuralHomestayOpenData') {
    const roomEvidence = content.roomCount
      ? ` 객실 수 ${content.roomCount.toLocaleString()}실 정보도 확인됩니다.`
      : ''
    return `${subject}은 농어촌민박 신고 데이터에 포함되어 1박 2일 체류형 코스로 전환하기 좋습니다.${roomEvidence}`
  }

  if (content.source === 'NationalTourismStandardData') {
    const parkingEvidence = content.parkingCapacity
      ? ` 주차 가능 ${content.parkingCapacity.toLocaleString()}면 정보도 함께 확인됩니다.`
      : ''
    return `${subject}은 전국관광지정보표준데이터에서 영주시 제공 관광지로 확인됩니다.${parkingEvidence}`
  }

  return ''
}

function isRestaurant(content: TourismContent) {
  return content.contentTypeId === '39'
}

function isAccommodation(content: TourismContent) {
  return content.contentTypeId === '32'
}

function isCultureOrHistoryContent(content: TourismContent) {
  const searchableText = getContentSearchableText(content)
  return (
    content.contentTypeId === '14' ||
    searchableText.includes('역사') ||
    searchableText.includes('문화') ||
    searchableText.includes('서원') ||
    searchableText.includes('유적')
  )
}

function isNatureOrVillageContent(content: TourismContent) {
  const searchableText = getContentSearchableText(content)
  return (
    searchableText.includes('자연') ||
    searchableText.includes('마을') ||
    searchableText.includes('숲') ||
    searchableText.includes('산') ||
    searchableText.includes('강')
  )
}

function getContentSearchableText(content: TourismContent) {
  return [content.title, content.category, content.address, content.overview]
    .filter(Boolean)
    .join(' ')
}

function getContentReasonSubject(content: TourismContent) {
  const title = content.title?.trim()
  return title ? title : '이 장소'
}

export function formatMindTagFlow(mindTags: CourseMindTags | null | undefined) {
  return [
    mindTags?.emotionTag,
    mindTags?.situationTag,
    mindTags?.adviceTag,
  ]
    .map((tag) => tag?.trim())
    .filter((tag): tag is string => Boolean(tag))
    .join(' · ')
}

function hasMindTags(
  mindTags: CourseMindTags | null | undefined,
): mindTags is CourseMindTags {
  return Boolean(mindTags?.emotionTag || mindTags?.situationTag || mindTags?.adviceTag)
}

function hasAnyTagValue(tag: string, candidates: string[]) {
  return candidates.some((candidate) => tag.includes(candidate))
}
