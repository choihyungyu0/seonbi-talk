import type { Question } from './types'

export const seonbiQuestions: Question[] = [
  {
    id: 'q1',
    prompt: '여행을 시작하기 전 가장 먼저 하는 일은 무엇인가요?',
    options: [
      { id: 'q1-a', label: '방문 목적과 의미를 차분히 정리한다', scores: { toegye: 2 } },
      { id: 'q1-b', label: '동선과 필요한 시간을 먼저 계산한다', scores: { yulgok: 2 } },
      { id: 'q1-c', label: '여유롭게 머물 수 있는 흐름을 떠올린다', scores: { cheosa: 2 } },
      { id: 'q1-d', label: '함께 움직일 사람들의 역할을 나눈다', scores: { uguk: 2 } },
    ],
  },
  {
    id: 'q2',
    prompt: '낯선 상황에서 더 편안한 선택은 무엇인가요?',
    options: [
      { id: 'q2-a', label: '원칙을 확인하고 신중히 판단한다', scores: { toegye: 2 } },
      { id: 'q2-b', label: '문제를 작게 나누어 해결한다', scores: { yulgok: 2 } },
    ],
  },
  {
    id: 'q3',
    prompt: '가장 만족스러운 여행의 리듬은 무엇인가요?',
    options: [
      { id: 'q3-a', label: '천천히 읽고 생각하는 시간', scores: { toegye: 2 } },
      { id: 'q3-b', label: '필요한 것을 놓치지 않는 일정', scores: { yulgok: 2 } },
      { id: 'q3-c', label: '풍경을 보며 쉬어가는 시간', scores: { cheosa: 2 } },
      { id: 'q3-d', label: '좋은 경험을 주변과 나누는 시간', scores: { uguk: 2 } },
    ],
  },
  {
    id: 'q4',
    prompt: '여행 중 계획이 바뀌면 어떻게 하나요?',
    options: [
      { id: 'q4-a', label: '처음 세운 기준과 비교해 다시 판단한다', scores: { toegye: 2 } },
      { id: 'q4-b', label: '현재 조건에 맞게 빠르게 조정한다', scores: { yulgok: 2 } },
      { id: 'q4-c', label: '무리하지 않고 쉬어갈 방법을 찾는다', scores: { cheosa: 2 } },
      { id: 'q4-d', label: '동행자의 불편을 먼저 살핀다', scores: { uguk: 2 } },
    ],
  },
  {
    id: 'q5',
    prompt: '마음에 오래 남는 경험은 어떤 쪽인가요?',
    options: [
      { id: 'q5-a', label: '깊이 있는 설명을 듣고 이해한 경험', scores: { toegye: 2 } },
      { id: 'q5-b', label: '실제로 도움이 되는 정보를 얻은 경험', scores: { yulgok: 2 } },
    ],
  },
  {
    id: 'q6',
    prompt: '여행에서 중요한 가치는 무엇인가요?',
    options: [
      { id: 'q6-a', label: '배움과 성찰', scores: { toegye: 2 } },
      { id: 'q6-b', label: '효율과 균형', scores: { yulgok: 2 } },
      { id: 'q6-c', label: '쉼과 자연스러움', scores: { cheosa: 2 } },
      { id: 'q6-d', label: '책임과 나눔', scores: { uguk: 2 } },
    ],
  },
  {
    id: 'q7',
    prompt: '갈등이 생겼을 때 가까운 방식은 무엇인가요?',
    options: [
      { id: 'q7-a', label: '옳고 그름의 기준을 먼저 세운다', scores: { toegye: 2 } },
      { id: 'q7-b', label: '모두가 받아들일 해결책을 찾는다', scores: { yulgok: 2 } },
      { id: 'q7-c', label: '잠시 거리를 두고 마음을 가라앉힌다', scores: { cheosa: 2 } },
      { id: 'q7-d', label: '필요한 행동을 먼저 시작한다', scores: { uguk: 2 } },
    ],
  },
  {
    id: 'q8',
    prompt: '기록을 남긴다면 어떤 내용을 남기고 싶나요?',
    options: [
      { id: 'q8-a', label: '깨달은 생각과 문장', scores: { toegye: 2 } },
      { id: 'q8-b', label: '다음에 참고할 요령', scores: { yulgok: 2 } },
    ],
  },
  {
    id: 'q9',
    prompt: '쉬는 시간이 생기면 어떤 선택을 하나요?',
    options: [
      { id: 'q9-a', label: '조용한 곳에서 생각을 정리한다', scores: { toegye: 1, cheosa: 1 } },
      { id: 'q9-b', label: '남은 일정을 다시 점검한다', scores: { yulgok: 2 } },
      { id: 'q9-c', label: '주변 사람에게 필요한 것을 묻는다', scores: { uguk: 2 } },
      { id: 'q9-d', label: '발길 닿는 대로 천천히 걷는다', scores: { cheosa: 2 } },
    ],
  },
  {
    id: 'q10',
    prompt: '좋은 여행을 한 문장으로 표현한다면 무엇에 가깝나요?',
    options: [
      { id: 'q10-a', label: '나를 돌아보는 배움의 시간', scores: { toegye: 2 } },
      { id: 'q10-b', label: '필요한 것을 얻는 알찬 시간', scores: { yulgok: 2 } },
      { id: 'q10-c', label: '마음을 쉬게 하는 고요한 시간', scores: { cheosa: 2 } },
      { id: 'q10-d', label: '함께 더 나아지는 실천의 시간', scores: { uguk: 2 } },
    ],
  },
]
