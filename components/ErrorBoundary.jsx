import React from 'react';
import Link from 'next/link';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substring(7)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🔥 REACT ERROR BOUNDARY CAUGHT ERROR');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error ID:', this.state.errorId);
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    this.setState({
      error,
      errorInfo
    });

    // Send error to monitoring service (if configured)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '8px',
            padding: '32px',
            border: '1px solid #334155'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>⚠️</div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#f8fafc',
                marginBottom: '8px'
              }}>
                Something went wrong
              </h1>
              <p style={{
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                We encountered an unexpected error. Our team has been notified.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '16px',
                marginBottom: '24px',
                overflow: 'auto'
              }}>
                <p style={{
                  color: '#ef4444',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  margin: 0,
                  whiteSpace: 'pre-wrap'
                }}>
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre style={{
                    color: '#94a3b8',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    marginTop: '12px',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '24px'
            }}>
              <p style={{
                color: '#94a3b8',
                fontSize: '12px',
                margin: 0
              }}>
                <strong style={{ color: '#f8fafc' }}>Error ID:</strong>{' '}
                <code style={{
                  backgroundColor: '#1e293b',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '11px'
                }}>
                  {this.state.errorId}
                </code>
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                Reload Page
              </button>
              <Link href="/dashboard">
                <button
                  style={{
                    backgroundColor: '#475569',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#334155'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#475569'}
                >
                  Go to Dashboard
                </button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
