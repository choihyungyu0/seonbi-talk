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

      return {
        content,
        index,
        totalScore: keywordScore + contentTypeScore + mindTagScore,
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
  if (hasMindTags(mindTags)) {
    return createMindTagRecommendationReason(content, mindTags)
  }

  if (isRestaurant(content)) {
    return '여행 중 잠시 쉬어가며 지역의 맛을 경험하기 좋은 장소입니다.'
  }

  if (isAccommodation(content)) {
    return '하루의 여정을 차분히 마무리하기 좋은 머무름의 장소입니다.'
  }

  if (!seonbiType) {
    return createCategoryBasedRecommendationReason(content)
  }

  if (seonbiType === 'toegye') {
    return '차분한 배움과 성찰을 중시하는 퇴계형에게 어울리는 장소입니다.'
  }

  if (seonbiType === 'yulgok') {
    return '실천과 경험을 중시하는 율곡형에게 잘 맞는 코스입니다.'
  }

  if (seonbiType === 'cheosa') {
    return '여유와 쉼을 중시하는 처사형에게 어울리는 느린 여행지입니다.'
  }

  return '역사와 책임의 가치를 돌아보기 좋은 우국형 추천 장소입니다.'
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

function createMindTagRecommendationReason(
  content: TourismContent,
  mindTags: CourseMindTags,
) {
  const tagFlow = formatMindTagFlow(mindTags)
  if (isRestaurant(content)) {
    return `최근 읽어낸 마음인 '${tagFlow}' 흐름에 맞춰 쉬어가며 기운을 채우기 좋은 장소입니다.`
  }

  if (isAccommodation(content)) {
    return `최근 읽어낸 마음인 '${tagFlow}' 흐름에 맞춰 하루를 차분히 정리하기 좋은 머무름입니다.`
  }

  if (isNatureOrVillageContent(content)) {
    return `최근 읽어낸 마음인 '${tagFlow}' 흐름에 맞춰 천천히 숨을 고르기 좋은 여행지입니다.`
  }

  if (isCultureOrHistoryContent(content)) {
    return `최근 읽어낸 마음인 '${tagFlow}' 흐름에 맞춰 배움과 생각을 정리하기 좋은 장소입니다.`
  }

  return `최근 읽어낸 마음인 '${tagFlow}' 흐름에 맞춰 추천하는 영주 코스입니다.`
}

function createCategoryBasedRecommendationReason(content: TourismContent) {
  if (isCultureOrHistoryContent(content)) {
    return '영주의 역사와 문화를 차분히 살펴보기 좋은 장소입니다.'
  }

  if (isNatureOrVillageContent(content)) {
    return '자연과 마을의 분위기를 천천히 느끼기 좋은 여행지입니다.'
  }

  return '영주 여행의 흐름에 자연스럽게 더하기 좋은 추천 장소입니다.'
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
