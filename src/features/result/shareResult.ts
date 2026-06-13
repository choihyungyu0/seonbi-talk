import type { SeonbiTypeInfo } from '../seonbi-test/types'

export type ShareResultStatus = 'shared' | 'copied' | 'cancelled'

export function createResultShareText(typeInfo: SeonbiTypeInfo) {
  return `나는 영주선비길에서 ${typeInfo.joseonTitle}(${typeInfo.name})이 나왔어요. ${typeInfo.friendInviteText}`
}

export async function shareResult(typeInfo: SeonbiTypeInfo): Promise<ShareResultStatus> {
  const text = createResultShareText(typeInfo)
  const shareData = {
    title: '영주선비길 선비유형 결과',
    text,
  }

  if (canUseWebShare(shareData)) {
    try {
      await navigator.share(shareData)
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
    }
  }

  await copyText(text)
  return 'copied'
}

function canUseWebShare(data: ShareData) {
  if (!navigator.share) return false
  if (!isLikelyMobileShareDevice()) return false
  if (!navigator.canShare) return true
  return navigator.canShare(data)
}

function isLikelyMobileShareDevice() {
  return navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches
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
