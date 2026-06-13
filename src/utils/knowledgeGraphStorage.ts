export interface SavedKnowledgeGraph<TNode = unknown, TEdge = unknown> {
  id: string
  title: string
  nodes: TNode[]
  edges: TEdge[]
  createdAt: string
}

const knowledgeGraphStorageKey = 'yeongju-seonbi:knowledge-graphs'

export function loadSavedKnowledgeGraphs<TNode = unknown, TEdge = unknown>() {
  if (typeof window === 'undefined') return [] as SavedKnowledgeGraph<TNode, TEdge>[]

  try {
    const rawGraphs = window.localStorage.getItem(knowledgeGraphStorageKey)
    if (!rawGraphs) return []
    const parsedGraphs = JSON.parse(rawGraphs)
    if (!Array.isArray(parsedGraphs)) return []
    return parsedGraphs as SavedKnowledgeGraph<TNode, TEdge>[]
  } catch {
    return []
  }
}

export function saveKnowledgeGraph<TNode, TEdge>(
  graph: Omit<SavedKnowledgeGraph<TNode, TEdge>, 'id' | 'createdAt'>,
) {
  const savedGraph: SavedKnowledgeGraph<TNode, TEdge> = {
    ...graph,
    id: `graph-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  const graphs = loadSavedKnowledgeGraphs<TNode, TEdge>()
  const nextGraphs = [savedGraph, ...graphs].slice(0, 6)
  window.localStorage.setItem(knowledgeGraphStorageKey, JSON.stringify(nextGraphs))
  return nextGraphs
}
