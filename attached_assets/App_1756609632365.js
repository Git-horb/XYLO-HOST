import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './config';

function App() {
  const [token, setToken] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth`;
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/deploy`, {
        sessionId,
        branchName,
        token
      });
      setMessage(response.data.message);
      if (response.data.success) {
        setSessionId('');
        setBranchName('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Deployment failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white p-4 text-center">
        <h1 className="text-2xl font-bold">XYLO-MD Deployment</h1>
        <p className="text-sm">Deploy your bot with ease</p>
      </header>
      <div className="container">
        <div className="bg-white p-6 rounded-lg shadow-md">
          {!token ? (
            <>
              <h2 className="text-xl font-semibold mb-4">Login to Deploy</h2>
              <button
                onClick={handleLogin}
                className="w-full bg-secondary text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center justify-center"
              >
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.66-.22.66-.49v-1.73c-2.78.61-3.36-1.34-3.36-1.34-.46-1.16-1.12-1.47-1.12-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 6.8c.85.004 1.71.11 2.52.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.67.94.67 1.89v2.8c0 .28.16.59.67.49A10.01 10.01 0 0022 12c0-5.52-4.48-10-10-10z" />
                </svg>
                Login with GitHub
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4">Deploy XYLO-MD</h2>
              <form onSubmit={handleDeploy} className="space-y-4">
                <div>
                  <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700">
                    Session ID
                  </label>
                  <input
                    type="text"
                    id="sessionId"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="mt-1 w-full p-2 border rounded-lg focus:ring-secondary focus:border-secondary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="branchName" className="block text-sm font-medium text-gray-700">
                    Branch Name (optional)
                  </label>
                  <input
                    type="text"
                    id="branchName"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="mt-1 w-full p-2 border rounded-lg focus:ring-secondary focus:border-secondary"
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-accent text-white py-3 rounded-lg hover:bg-green-700 transition duration-300"
                >
                  Deploy
                </button>
                {message && <p className="text-green-600">{message}</p>}
                {error && <p className="text-red-600">{error}</p>}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;