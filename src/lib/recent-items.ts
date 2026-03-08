const STORAGE_KEY = "recent-items"
const MAX_ITEMS = 5

export type RecentItem = {
  id: string
  title: string
  pubCode: string
}

export function getRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addRecentItem(item: RecentItem) {
  const items = getRecentItems().filter(i => i.id !== item.id)
  items.unshift(item)
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}
