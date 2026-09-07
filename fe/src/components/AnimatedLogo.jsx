// src/components/AnimatedLogo.jsx
import { useEffect, useState } from 'react';
import { SmileOutlined } from '@ant-design/icons';

const AnimatedLogo = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    // Start pulse after entrance
    const pulseTimer = setTimeout(() => setIsPulsing(true), 800);

    return () => {
      clearTimeout(timer);
      clearTimeout(pulseTimer);
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 24,
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(-30px)',
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          animation: isPulsing ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      >
        <SmileOutlined
          style={{
            fontSize: 40,
            color: '#fff',
            animation: isVisible ? 'float 3s ease-in-out infinite' : 'none',
          }}
        />
        {/* Ripple effect */}
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: '2px solid rgba(102, 126, 234, 0.2)',
            animation: isPulsing ? 'ripple 2s ease-out infinite' : 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: -12,
            borderRadius: '50%',
            border: '2px solid rgba(102, 126, 234, 0.1)',
            animation: isPulsing ? 'ripple 2s ease-out infinite 0.5s' : 'none',
          }}
        />
      </div>
      <h1
        style={{
          marginTop: 16,
          marginBottom: 4,
          fontSize: 28,
          fontWeight: 700,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.5px',
        }}
      >
        Happy Call
      </h1>
      <p
        style={{
          color: '#888',
          fontSize: 14,
          marginBottom: 0,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.6s ease 0.3s',
        }}
      >
        Internal Control & Verification
      </p>
    </div>
  );
};

export default AnimatedLogo;