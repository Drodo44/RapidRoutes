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
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-900 border border-red-700 text-red-50 rounded-lg">
          <h3 className="text-lg font-bold mb-2">
            Error in {this.props.componentName || 'component'}
          </h3>
          <div className="p-3 bg-red-950 rounded font-mono text-xs mb-3">
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
          
          {this.props.fallback ? (
            this.props.fallback
          ) : (
            <button 
              className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
          )}
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;