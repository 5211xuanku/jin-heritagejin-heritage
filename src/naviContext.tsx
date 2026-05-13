import { createContext, useContext } from 'react'

export type NaviState = {
  /** Template to auto-select when entering FaceWorkshop */
  faceTemplate: string | null
  /** Search query for ShopPanel */
  shopQuery: string | null
  /** Navigate to face tab with a template pre-selected */
  goToFace: (templateId: string) => void
  /** Navigate to shop tab with a search query */
  goToShop: (query: string) => void
  /** Clear navigation state */
  clear: () => void
}

export const NaviContext = createContext<NaviState>({
  faceTemplate: null,
  shopQuery: null,
  goToFace: () => {},
  goToShop: () => {},
  clear: () => {},
})

export function useNavi() {
  return useContext(NaviContext)
}
