import { useEffect } from 'react'
import { useLanguage } from './LanguageContext'
import { containsKorean, translateKoreanText } from './translations'

const translatedAttributes = ['aria-label', 'alt', 'placeholder', 'title'] as const
const skippedTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA'])
const originalTextNodes = new WeakMap<Text, string>()
const originalAttributes = new WeakMap<Element, Map<string, string>>()
let originalDocumentTitle = ''

function canTranslateTextNode(node: Text) {
  const parentElement = node.parentElement
  if (!parentElement) return false

  const closestSkippedElement = parentElement.closest('[data-i18n-skip]')
  if (closestSkippedElement) return false

  return !skippedTags.has(parentElement.tagName)
}

function setTranslatedTextNode(node: Text) {
  if (!canTranslateTextNode(node)) return

  const currentText = node.nodeValue ?? ''
  if (!containsKorean(currentText)) return

  if (!originalTextNodes.has(node)) {
    originalTextNodes.set(node, currentText)
  }

  const originalText = originalTextNodes.get(node) ?? currentText
  node.nodeValue = translateKoreanText(originalText)
}

function restoreTextNode(node: Text) {
  const originalText = originalTextNodes.get(node)
  if (originalText === undefined) return

  node.nodeValue = originalText
  originalTextNodes.delete(node)
}

function translateTextNodes(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

  while (walker.nextNode()) {
    setTranslatedTextNode(walker.currentNode as Text)
  }
}

function restoreTextNodes(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

  while (walker.nextNode()) {
    restoreTextNode(walker.currentNode as Text)
  }
}

function setTranslatedAttributes(root: ParentNode) {
  const elements =
    root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : []

  elements.forEach((element) => {
    translatedAttributes.forEach((attributeName) => {
      const currentValue = element.getAttribute(attributeName)
      if (!currentValue || !containsKorean(currentValue)) return

      let originalValues = originalAttributes.get(element)
      if (!originalValues) {
        originalValues = new Map()
        originalAttributes.set(element, originalValues)
      }

      if (!originalValues.has(attributeName)) {
        originalValues.set(attributeName, currentValue)
      }

      element.setAttribute(attributeName, translateKoreanText(originalValues.get(attributeName) ?? currentValue))
    })
  })
}

function restoreAttributes(root: ParentNode) {
  const elements =
    root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : []

  elements.forEach((element) => {
    const originalValues = originalAttributes.get(element)
    if (!originalValues) return

    originalValues.forEach((value, attributeName) => {
      element.setAttribute(attributeName, value)
    })
    originalAttributes.delete(element)
  })
}

function translateDocument() {
  if (!originalDocumentTitle) {
    originalDocumentTitle = document.title
  }

  translateTextNodes(document.body)
  setTranslatedAttributes(document.body)
  document.title = translateKoreanText(originalDocumentTitle)
}

function restoreDocument() {
  restoreTextNodes(document.body)
  restoreAttributes(document.body)
  if (originalDocumentTitle) {
    document.title = originalDocumentTitle
    originalDocumentTitle = ''
  }
}

export function AutoTranslator() {
  const { language } = useLanguage()

  useEffect(() => {
    if (language === 'ko') {
      restoreDocument()
      return
    }

    let frameId = window.requestAnimationFrame(translateDocument)

    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(translateDocument)
    })

    observer.observe(document.body, {
      attributeFilter: [...translatedAttributes],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [language])

  return null
}
