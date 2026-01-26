// /pages/404.js
export default function Custom404() {
  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(239, 68, 68, 0.08) 0%, transparent 50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      textAlign: 'center'
    }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <img 
          src="/logo.png" 
          alt="RapidRoutes" 
          style={{ 
            height: '48px',
            opacity: 0.7,
            filter: 'drop-shadow(0 4px 12px rgba(239, 68, 68, 0.3))'
          }} 
        />
      </div>
      <h1 style={{
        fontSize: '72px',
        fontWeight: 800,
        background: 'linear-gradient(135deg, var(--danger) 0%, var(--warning) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: 'var(--space-4)',
        lineHeight: 1
      }}>
        404
      </h1>
      <p style={{
        fontSize: '18px',
        color: 'var(--text-secondary)',
        marginBottom: 'var(--space-6)'
      }}>
        Page Not Found
      </p>
      <p style={{
        fontSize: '14px',
        color: 'var(--text-tertiary)',
        marginBottom: 'var(--space-8)',
        maxWidth: '400px'
      }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a 
        href="/dashboard" 
        className="btn btn-primary"
        style={{ textDecoration: 'none' }}
      >
        Return to Dashboard
      </a>
    </main>
  );
}
