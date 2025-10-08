// components/ErrorBoundary.js
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      isReact130Error: false
    };
  }
  
  static getDerivedStateFromError(error) {
    const isReact130Error = 
      error.message.includes('Element type is invalid') || 
      error.message.includes('expected a string') ||
      error.message.includes('not a valid React child');
      
    return { 
      hasError: true, 
      error,
      isReact130Error 
    };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log the error to the console
    console.error(`Error in ${this.props.componentName || 'component'}:`, error);
    console.log('Component stack:', errorInfo.componentStack);
    
    this.setState({
      errorInfo
    });
    
    // Track specific React Error #130
    if (error.message.includes('Element type is invalid') || 
        error.message.includes('React.createElement') ||
        error.message.includes('expected a string') ||
        error.message.includes('not a valid React child')) {
      console.error('🚨 DETECTED REACT ERROR #130:', error.message);
      console.error(`🧩 In component: ${this.props.componentName || 'unknown'}`);
      
      // Try to extract the component name from the error
      try {
        const match = error.message.match(/type "(.*?)"/) || 
                     error.message.match(/type `(.*?)`/) || 
                     error.message.match(/expected a string \(for built-in components\) or a class\/function \(for composite components\) but got: (.*?)\.$/);
        
        if (match && match[1]) {
          console.log('🔍 Problematic component type:', match[1]);
        }
        
        // Log the component stack to help identify import issues
        console.log('📚 Component stack (first 3 lines):');
        const stackLines = this.state.errorInfo?.componentStack.split('\n').slice(0, 4);
        stackLines.forEach(line => console.log('  ' + line.trim()));
      } catch (e) {
        console.log('Could not parse error details:', e);
      }
    }
    
    // Send to error logging service in production
    if (process.env.NODE_ENV === 'production') {
      // You could add error reporting service integration here
      // Example: sendToErrorLogging(error, errorInfo);
    }
  }
  
  render() {
    if (this.state.hasError) {
      // Production error UI
      if (process.env.NODE_ENV === 'production') {
        return (
          <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-red-600 p-4">
                <h1 className="text-xl font-bold">System Error</h1>
              </div>
              <div className="p-6">
                <p className="mb-4">
                  We apologize for the inconvenience. A system error has occurred while processing your request.
                </p>
                <div className="mt-4 p-3 bg-gray-900 border border-gray-700 rounded">
                  <p className="text-gray-300 text-sm">
                    Error reference: {new Date().toISOString().slice(0,19).replace('T', ' ')}
                  </p>
                </div>
                <div className="mt-6 flex space-x-3">
                  <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </button>
                  <button 
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                    onClick={() => window.location.href = '/'}
                  >
                    Return Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      // Development error UI with detailed information
      return (
        <div className="p-4 bg-gray-900 border border-gray-700 text-gray-100 rounded-lg">
          <h3 className="text-lg font-bold mb-2">
            Error in {this.props.componentName || 'component'}
          </h3>
          <div className="p-3 bg-gray-950 rounded font-mono text-xs mb-3 overflow-auto max-h-40">
            {this.state.error?.message || 'Unknown error'}
          </div>
          
          {this.state.isReact130Error && (
            <div className="p-3 bg-amber-900 text-amber-50 rounded mb-3">
              <strong>React Error #130 detected!</strong>
              <p className="text-sm">
                This error occurs when a component is an object instead of a function.
                Check the import/export pattern of this component.
              </p>
            </div>
          )}
          
          {this.state.errorInfo && (
            <details className="mt-3 mb-3">
              <summary className="cursor-pointer text-blue-400">Component Stack Trace</summary>
              <pre className="mt-2 p-3 bg-gray-950 text-xs text-gray-300 overflow-auto max-h-60">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          
          <div className="flex space-x-3">
            {this.props.fallback ? (
              this.props.fallback
            ) : (
              <button 
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Try Again
              </button>
            )}
            <button 
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              onClick={() => window.location.href = '/'}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;