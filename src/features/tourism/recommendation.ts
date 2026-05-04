import type { SeonbiType } from '../seonbi-test/types'
import type { RecommendedCourse, TourismContent } from './tourismTypes'

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

      return {
        content,
        index,
        keywordScore,
        contentTypeScore,
        hasImage: Boolean(content.firstImage || content.firstImage2),
        hasCoordinates: content.mapX !== undefined && content.mapY !== undefined,
        hasAddress: Boolean(content.address),
      }
    })
    .sort((a, b) => {
      return (
        b.keywordScore - a.keywordScore ||
        b.contentTypeScore - a.contentTypeScore ||
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
) {
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
  return [content.title, content.category, content.address].filter(Boolean).join(' ')
}
