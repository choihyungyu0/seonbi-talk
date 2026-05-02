import type { SeonbiTypeInfo } from '../seonbi-test/types'

export type ShareResultStatus = 'shared' | 'copied' | 'cancelled'

export function createResultShareText(typeInfo: SeonbiTypeInfo) {
  return `나는 영주선비길에서 ${typeInfo.name} 선비가 나왔어요. 나의 선비유형으로 영주 여행길을 찾아보세요.`
}

export async function shareResult(typeInfo: SeonbiTypeInfo): Promise<ShareResultStatus> {
  const text = createResultShareText(typeInfo)

  if (navigator.share) {
    try {
      await navigator.share({
        title: '영주선비길 선비유형 결과',
        text,
      })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
      throw error
    }
  }

  await copyText(text)
  return 'copied'
}

async function copyText(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  const copied = document.execCommand('copy')
  textarea.remove()

  if (!copied) {
    throw new Error('copy failed')
  }
}
