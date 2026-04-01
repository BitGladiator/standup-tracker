const Login = () => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '16px',
      }}>
        <h1>Standup Tracker</h1>
        <p>Auto-generate your daily standup from GitHub activity.</p>
        <a href={`${import.meta.env.VITE_API_URL}/api/auth/github`}>
          <button>Login with GitHub</button>
        </a>
      </div>
    );
  };
  
  export default Login;