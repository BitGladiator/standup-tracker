import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings } from '../api/client.js';

const Settings = () => {
  const navigate = useNavigate();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then((data) => setWebhookUrl(data.slack_webhook_url || ''))
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setStatus('saving');
    setError(null);
    try {
      await saveSettings({ slack_webhook_url: webhookUrl });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err.error || 'Failed to save');
      setStatus('error');
    }
  };

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>

      <button
        onClick={() => navigate('/dashboard')}
        style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '13px', padding: 0, marginBottom: '8px' }}
      >
        ← Back to dashboard
      </button>
      <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a202c', margin: '0 0 32px' }}>
        Settings
      </h1>

      <div style={{ background: '#F7FAFC', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#2d3748', margin: '0 0 6px' }}>
          Slack integration
        </h2>
        <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 20px', lineHeight: '1.6' }}>
          Paste your Slack Incoming Webhook URL to automatically post your standup when you save it.
          Get one from Slack → Apps → Incoming Webhooks.
        </p>

        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#4a5568', marginBottom: '6px' }}>
          Webhook URL
        </label>
        <input
          type="text"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '13px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'monospace',
            color: '#1a202c',
            background: '#fff',
          }}
        />

        {error && (
          <p style={{ fontSize: '12px', color: '#C53030', marginTop: '8px' }}>{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          style={{
            marginTop: '16px',
            padding: '9px 20px',
            fontSize: '13px',
            fontWeight: '500',
            background: '#3182CE',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: status === 'saving' ? 'not-allowed' : 'pointer',
            opacity: status === 'saving' ? 0.7 : 1,
          }}
        >
          {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save'}
        </button>
      </div>

    </div>
  );
};

export default Settings;