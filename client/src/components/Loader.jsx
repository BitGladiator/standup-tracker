import React from 'react';

const Loader = ({ text }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        gap: '24px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <span className="loader" aria-label="Loading"></span>
      {text && (
        <p
          style={{
            fontSize: '14px',
            color: '#718096',
            margin: 0,
            fontWeight: '500',
            textAlign: 'center',
            animation: 'pulse 1.5s infinite ease-in-out',
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
};

export default Loader;
