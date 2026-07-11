import { Component } from 'react'
import { reportarError } from '../../lib/reportarError'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    reportarError(error, { pantalla: window.location.pathname, metadata: { componentStack: info?.componentStack } })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6" style={{ background: '#0D0D14' }}>
          <span className="text-5xl">⚠️</span>
          <h2 className="text-white font-bold text-lg">Algo salió mal</h2>
          <p className="text-gray-400 text-sm text-center max-w-xs">
            Ocurrió un error inesperado. Intentá recargar la página.
          </p>
          <button onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl font-semibold text-sm text-white"
            style={{ background: '#F97316' }}>
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
