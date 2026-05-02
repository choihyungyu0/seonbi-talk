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
