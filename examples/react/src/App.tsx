import { useEffect, useState } from 'react';
import { logger } from './logger';

function App() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // 设置用户信息
    const mockUser = { id: '123', name: 'John Doe', email: 'john@example.com' };
    logger.setUser(mockUser);
    setUser(mockUser);

    // 设置上下文
    logger.setContext({
      env: 'production',
      release: '1.0.0',
    });

    logger.info('app_mount', 'App mounted');
  }, []);

  const handleInfo = () => {
    logger.info('button_click', 'Info button clicked', { button: 'info' });
  };

  const handleError = () => {
    logger.error('button_click', 'Error button clicked', { button: 'error' });
    throw new Error('Test error from button');
  };

  const handleFetch = async () => {
    try {
      const response = await fetch('https://api.github.com/users/octocat');
      const data = await response.json();
      logger.info('api_success', 'GitHub API success', { login: data.login });
    } catch (error) {
      logger.error('api_error', 'GitHub API error', { error: String(error) });
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Traceway Logger - React Example</h1>
      
      {user && (
        <div>
          <p>当前用户: {user.name} ({user.id})</p>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <button onClick={handleInfo} style={{ marginRight: '10px' }}>
          记录 Info
        </button>
        <button onClick={handleError} style={{ marginRight: '10px' }}>
          触发错误
        </button>
        <button onClick={handleFetch}>
          测试 HTTP 请求
        </button>
      </div>
    </div>
  );
}

export default App;

