'use client';

export default function OfficePage() {
  return (
    <div style={{ 
      width: '100%', 
      height: '100vh',
      background: '#1a1a2e',
      overflow: 'hidden'
    }}>
      <iframe 
        src="/office/index.html"
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none'
        }}
        title="Brain Agents Pixel Office"
      />
    </div>
  );
}
