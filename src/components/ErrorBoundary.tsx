import React from 'react';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error; info?: React.ErrorInfo };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // You can log this to an error reporting service
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h1>Something went wrong.</h1>
          <p style={{ color: '#c00' }}>{this.state.error?.message}</p>
          {this.state.info && (
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.info.componentStack}
            </pre>
          )}
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
