import html2canvas from 'html2canvas'

const resultImageFileName = 'yeongju-seonbi-result.png'

export async function saveResultImage(element: HTMLElement) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#fffdf9',
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true,
  })

  const imageUrl = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = imageUrl
  link.download = resultImageFileName
  document.body.appendChild(link)
  link.click()
  link.remove()
}
