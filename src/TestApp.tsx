import React from 'react';

export function TestApp() {
  console.log('TestApp rendering');
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      color: 'white',
      fontSize: '24px',
      fontFamily: 'sans-serif',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1>React is Loading!</h1>
      <p>If you see this, React is working.</p>
      <p>Check the console for errors.</p>
    </div>
  );
}
