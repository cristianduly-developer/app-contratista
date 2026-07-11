import { createContext, useContext } from 'react'

export const PlanContext = createContext('basico')

const FEATURES = {
  basico: {
    max_obras: 3,
    max_gremios: 5,
    links_publicos: false,
    fotos: false,
  },
  profesional: {
    max_obras: 6,
    max_gremios: 8,
    links_publicos: true,
    fotos: true,
  },
  premium: {
    max_obras: Infinity,
    max_gremios: Infinity,
    links_publicos: true,
    fotos: true,
  },
}

export function usePlan() {
  const plan = useContext(PlanContext)
  const features = FEATURES[plan] || FEATURES.basico
  return { plan, features, tieneFeature: (f) => !!features[f] }
}
