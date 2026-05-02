import type { SeonbiType, SeonbiTypeInfo } from '../features/seonbi-test/types'

export const seonbiTypeInfo: Record<SeonbiType, SeonbiTypeInfo> = {
  toegye: {
    id: 'toegye',
    name: '퇴계형',
    title: '학문과 원칙을 중시하는 사색형',
    description: '학문과 원칙을 중시하는 사색형 선비',
    tags: ['사색', '원칙', '깊이'],
    travelStyle: '차분히 머물며 의미를 살피는 여행',
    recommendedKeywords: ['소수서원', '부석사'],
  },
  yulgok: {
    id: 'yulgok',
    name: '율곡형',
    title: '현실 문제 해결을 중시하는 실용형',
    description: '현실 문제 해결을 중시하는 실용형 선비',
    tags: ['실용', '균형', '계획'],
    travelStyle: '동선과 목적을 정리해 효율적으로 둘러보는 여행',
    recommendedKeywords: ['선비세상', '풍기인삼'],
  },
  cheosa: {
    id: 'cheosa',
    name: '처사형',
    title: '자연과 여유를 사랑하는 은둔형',
    description: '자연과 여유를 사랑하는 은둔형 선비',
    tags: ['자연', '여유', '쉼'],
    travelStyle: '조용한 풍경 속에서 속도를 낮추는 여행',
    recommendedKeywords: ['무섬마을', '부석사'],
  },
  uguk: {
    id: 'uguk',
    name: '우국형',
    title: '정의감과 행동력이 강한 실천형',
    description: '정의감과 행동력이 강한 실천형 선비',
    tags: ['실천', '책임', '공동체'],
    travelStyle: '가치와 이야기를 따라 능동적으로 움직이는 여행',
    recommendedKeywords: ['소수서원', '선비세상'],
  },
}

export const seonbiTypeNames = Object.values(seonbiTypeInfo).map(
  (type) => type.name,
)
