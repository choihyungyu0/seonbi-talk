import type { SeonbiType } from '../seonbi-test/types'
import type { RecommendedCourse, TourismContent } from './tourismTypes'

const keywordsByType: Record<SeonbiType, string[]> = {
  toegye: ['서원', '문화유산', '학문', '전통', '조용한'],
  yulgok: ['체험', '시장', '실용', '도시', '가족'],
  cheosa: ['자연', '산책', '마을', '강', '산', '숲'],
  uguk: ['역사', '문화유산', '기념', '교육', '의미'],
}

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
  const scoredContents = contents
    .map((content, index) => ({
      content,
      index,
      score: scoreTourismContent(content, keywords),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)

  return {
    seonbiType,
    items: scoredContents
      .filter((item) => item.score > 0)
      .map((item) => item.content),
    reason: scoredContents.some((item) => item.score > 0)
      ? undefined
      : 'no_data',
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
