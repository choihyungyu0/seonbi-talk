import type { SeonbiType } from '../seonbi-test/types'
import type { JudgeAdviceRequest, JudgeRequestBody, JudgeResponse } from './judgeTypes'

export async function requestSeonbiAdvice(
  input: string | JudgeAdviceRequest,
  seonbiType?: SeonbiType,
): Promise<JudgeResponse> {
  try {
    const requestBody: JudgeRequestBody =
      typeof input === 'string' ? { text: input, seonbiType } : input
    const response = await fetch('/api/judge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const data = (await response.json().catch(() => ({}))) as JudgeResponse

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        emptyReason: data.emptyReason ?? 'api_error',
        message:
          data.message ??
          '선비의 한마디를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      }
    }

    return data
  } catch {
    return {
      ok: false,
      emptyReason: 'api_error',
      message:
        '선비의 한마디를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }
  }
}
