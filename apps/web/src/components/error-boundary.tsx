import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: (props: { error: unknown; reset: () => void }) => ReactNode
  resetKey?: unknown
}

interface ErrorBoundaryState {
  error: unknown
  hasError: boolean
  resetKey?: unknown
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: undefined,
    hasError: false,
    resetKey: this.props.resetKey,
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error, hasError: true }
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { error: undefined, hasError: false, resetKey: props.resetKey }
    }
    return null
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Render error', error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: undefined, hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback({ error: this.state.error, reset: this.reset })
    }
    return this.props.children
  }
}
