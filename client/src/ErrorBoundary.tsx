import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to external error reporting service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In a real app, you would send this to your error reporting service
    // like Sentry, LogRocket, or Bugsnag
    console.error('Error logged:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReportError = () => {
    const errorReport = {
      message: this.state.error?.message || 'Unknown error',
      stack: this.state.error?.stack || '',
      componentStack: this.state.errorInfo?.componentStack || '',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Copy error report to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error report copied to clipboard. Please share it with our support team.');
      })
      .catch(() => {
        alert('Unable to copy error report. Please take a screenshot and report the issue.');
      });
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
          fontFamily: 'Arial, sans-serif',
          color: 'white',
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {/* Error Icon */}
            <div style={{
              fontSize: '64px',
              marginBottom: '20px',
              animation: 'pulse 2s infinite'
            }}>
              💥
            </div>

            {/* Error Title */}
            <h1 style={{
              margin: '0 0 15px 0',
              fontSize: '28px',
              fontWeight: 'bold'
            }}>
              Oops! Something went wrong
            </h1>

            {/* Error Description */}
            <p style={{
              margin: '0 0 25px 0',
              fontSize: '16px',
              opacity: 0.9,
              lineHeight: '1.6'
            }}>
              The game encountered an unexpected error and couldn't continue. 
              Don't worry - your progress should be saved.
            </p>

            {/* Error Details (for development) */}
            {import.meta.env.DEV && this.state.error && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '25px',
                textAlign: 'left',
                fontSize: '12px',
                fontFamily: 'monospace',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                <strong>Error Details (Development):</strong>
                <br />
                <br />
                <strong>Message:</strong> {this.state.error.message}
                <br />
                <br />
                <strong>Stack:</strong>
                <pre style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <>
                    <br />
                    <strong>Component Stack:</strong>
                    <pre style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(45deg, #2ecc71, #27ae60)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(46, 204, 113, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                🔄 Try Again
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(45deg, #3498db, #2980b9)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                🔃 Reload Page
              </button>

              <button
                onClick={this.handleReportError}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                📋 Report Bug
              </button>
            </div>

            {/* Help Text */}
            <p style={{
              margin: '25px 0 0 0',
              fontSize: '14px',
              opacity: 0.7,
              lineHeight: '1.5'
            }}>
              If the problem persists, try refreshing the page or clearing your browser cache.
              <br />
              For technical support, please report the bug with the error details.
            </p>
          </div>

          {/* CSS Animations */}
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component version with React Hook (alternative approach)
export const ErrorBoundaryHook: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ 
  children, 
  fallback 
}) => {
  // Note: React doesn't yet have a hook equivalent for componentDidCatch
  // This is just a placeholder for future React versions
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
};

export default ErrorBoundary;