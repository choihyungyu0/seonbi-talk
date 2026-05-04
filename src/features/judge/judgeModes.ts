import type { JudgeMode } from './judgeTypes'
import type { SeonbiType, SeonbiTypeName } from '../seonbi-test/types'

export interface JudgeModeOption {
  id: JudgeMode
  label: string
  badge: string
  description: string
}

export const judgeModeOptions: JudgeModeOption[] = [
  {
    id: 'default',
    label: '기본 선비',
    badge: '기본',
    description: '선비유형 말투를 그대로 살립니다.',
  },
  {
    id: 'strict',
    label: '엄격한 선비',
    badge: '엄격',
    description: '절제와 수양을 중심으로 말합니다.',
  },
  {
    id: 'practical',
    label: '현실적인 선비',
    badge: '현실',
    description: '바로 할 수 있는 해결책을 짚습니다.',
  },
  {
    id: 'hermit',
    label: '은둔 선비',
    badge: '은둔',
    description: '쉼과 마음 비움을 권합니다.',
  },
  {
    id: 'righteous',
    label: '의병 선비',
    badge: '의병',
    description: '책임과 행동을 북돋습니다.',
  },
  {
    id: 'praise',
    label: '칭찬 선비',
    badge: '칭찬',
    description: '따뜻한 격려를 먼저 건넵니다.',
  },
  {
    id: 'roast',
    label: '팩폭 선비',
    badge: '팩폭',
    description: '불쾌하지 않은 직설 유머로 말합니다.',
  },
  {
    id: 'petition',
    label: '상소문 변환',
    badge: '상소문',
    description: '고민을 짧은 상소문처럼 바꿉니다.',
  },
  {
    id: 'poison',
    label: '사약 판정',
    badge: '사약',
    description: '과장된 밈 판정으로 가볍게 말합니다.',
  },
]

export function getJudgeModeOption(judgeMode: JudgeMode | undefined) {
  return (
    judgeModeOptions.find((option) => option.id === judgeMode) ??
    judgeModeOptions.find((option) => option.id === 'default') ??
    {
      id: 'default',
      label: '기본 선비',
      badge: '기본',
      description: '선비유형 말투를 그대로 살립니다.',
    }
  )
}

export function getSeonbiVisualImagePath(
  seonbiType: SeonbiType,
  judgeMode: JudgeMode,
) {
  if (hasModeSpecificSeonbiImage(seonbiType) && judgeMode !== 'default') {
    return `/images/seonbi/${seonbiType}-${judgeMode}.png`
  }

  return `/images/seonbi/${seonbiType}.png`
}

export function getSeonbiVisualImagePreloadPaths(seonbiType: SeonbiType) {
  return judgeModeOptions.map((option) =>
    getSeonbiVisualImagePath(seonbiType, option.id),
  )
}

export function getSeonbiVisualImageAlt(
  seonbiTypeName: SeonbiTypeName,
  judgeMode: JudgeMode,
) {
  if (judgeMode === 'default') return `${seonbiTypeName} 선비 이미지`

  return `${seonbiTypeName} 선비 ${getJudgeModeOption(judgeMode).badge} 모드 이미지`
}

function hasModeSpecificSeonbiImage(seonbiType: SeonbiType) {
  return (
    seonbiType === 'toegye' ||
    seonbiType === 'yulgok' ||
    seonbiType === 'cheosa' ||
    seonbiType === 'uguk'
  )
}
