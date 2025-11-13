import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  message?: string;
  progress?: number;
  showProgress?: boolean;
  tips?: string[];
  minDisplayTime?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  progress = 0,
  showProgress = false,
  tips = [
    '🏎️ Hold to drift right, release to straighten',
    '🎯 Score bonus points for long drift chains',
    '⚡ Higher speed = higher score multiplier',
    '🏆 Compete with friends in multiplayer rooms',
    '💰 Win real money by placing bets',
    '🎮 Practice in free mode to improve your skills',
    '📊 Check your statistics in the lobby',
    '🎪 Different track segments keep the game fresh',
    '🔄 Share your best runs with friends',
    '⚙️ Adjust settings for the best experience'
  ],
  minDisplayTime = 1000
}) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Cycle through tips
  useEffect(() => {
    if (tips.length === 0) return;

    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 3000); // Change tip every 3 seconds

    return () => clearInterval(interval);
  }, [tips.length]);

  // Track display time
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTime(prev => prev + 100);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Animation phases
  useEffect(() => {
    const phases = [
      { delay: 0, phase: 0 },     // Initial
      { delay: 500, phase: 1 },   // Logo appear
      { delay: 1000, phase: 2 },  // Message appear
      { delay: 1500, phase: 3 },  // Full UI
    ];

    phases.forEach(({ delay, phase }) => {
      setTimeout(() => setAnimationPhase(phase), delay);
    });
  }, []);

  const currentTip = tips.length > 0 ? tips[currentTipIndex] : null;
  const progressValue = showProgress ? Math.min(Math.max(progress, 0), 100) : 0;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 25% 20%, rgba(110, 139, 255, 0.16), transparent 55%), linear-gradient(160deg, #0B0F14 0%, #111723 60%, #0B0F14 100%)',
      color: 'var(--color-text-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'url("data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%236E8BFF\" fill-opacity=\"0.08\"%3E%3Cpath d=\"m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        opacity: 0.35,
        animation: 'backgroundFloat 20s ease-in-out infinite'
      }} />

      {/* Main Content Container */}
      <div style={{
        background: 'rgba(17, 23, 35, 0.82)',
        backdropFilter: 'blur(18px)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        border: '1px solid rgba(34, 48, 86, 0.7)',
        boxShadow: '0 24px 48px rgba(12, 20, 32, 0.6)',
        transform: animationPhase >= 1 ? 'scale(1)' : 'scale(0.9)',
        opacity: animationPhase >= 1 ? 1 : 0,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        
        {/* Logo/Icon */}
        <div style={{
          fontSize: '64px',
          marginBottom: '20px',
          transform: animationPhase >= 1 ? 'translateY(0)' : 'translateY(20px)',
          opacity: animationPhase >= 1 ? 1 : 0,
          transition: 'all 0.5s ease-out 0.2s'
        }}>
          🏎️
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: '32px',
          fontWeight: 'bold',
          background: 'linear-gradient(140deg, #6E8BFF, #ffffff)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          transform: animationPhase >= 1 ? 'translateY(0)' : 'translateY(20px)',
          opacity: animationPhase >= 1 ? 1 : 0,
          transition: 'all 0.5s ease-out 0.4s',
          letterSpacing: '-0.03em'
        }}>
          DRIFT CASH
        </h1>

        {/* Loading Message */}
        <p style={{
          margin: '0 0 30px 0',
          fontSize: '18px',
          color: 'var(--color-text-secondary)',
          transform: animationPhase >= 2 ? 'translateY(0)' : 'translateY(20px)',
          opacity: animationPhase >= 2 ? 0.9 : 0,
          transition: 'all 0.5s ease-out 0.6s'
        }}>
          {message}
        </p>

        {/* Progress Bar */}
        {showProgress && (
          <div style={{
            marginBottom: '30px',
            transform: animationPhase >= 2 ? 'translateY(0)' : 'translateY(20px)',
            opacity: animationPhase >= 2 ? 1 : 0,
            transition: 'all 0.5s ease-out 0.8s'
          }}>
            <div style={{
              background: 'rgba(29, 37, 51, 0.8)',
              borderRadius: '10px',
              height: '8px',
              marginBottom: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #6E8BFF, #4169E1)',
                height: '100%',
                borderRadius: '10px',
                width: `${progressValue}%`,
                transition: 'width 0.3s ease',
                boxShadow: '0 0 12px rgba(110, 139, 255, 0.35)'
              }} />
            </div>
            <div style={{
              fontSize: '14px',
              opacity: 0.8,
              color: 'var(--color-text-secondary)'
            }}>
              {progressValue.toFixed(0)}%
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {!showProgress && (
          <div style={{
            marginBottom: '30px',
            transform: animationPhase >= 2 ? 'translateY(0)' : 'translateY(20px)',
            opacity: animationPhase >= 2 ? 1 : 0,
            transition: 'all 0.5s ease-out 0.8s'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(110, 139, 255, 0.25)',
              borderTop: '3px solid rgba(110, 139, 255, 0.85)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
          </div>
        )}

        {/* Loading Dots Animation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '30px',
          transform: animationPhase >= 3 ? 'translateY(0)' : 'translateY(20px)',
          opacity: animationPhase >= 3 ? 1 : 0,
          transition: 'all 0.5s ease-out 1s'
        }}>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'rgba(110, 139, 255, 0.7)',
                animation: `pulse 1.5s ease-in-out ${index * 0.3}s infinite`
              }}
            />
          ))}
        </div>

        {/* Tip Section */}
        {currentTip && (
          <div style={{
            background: 'rgba(17, 23, 35, 0.75)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(34, 48, 86, 0.6)',
            transform: animationPhase >= 3 ? 'translateY(0)' : 'translateY(20px)',
            opacity: animationPhase >= 3 ? 1 : 0,
            transition: 'all 0.5s ease-out 1.2s'
          }}>
            <div style={{
              fontSize: '14px',
              opacity: 0.8,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-text-secondary)'
            }}>
              💡 Game Tip
            </div>
            <div
              key={currentTipIndex} // Force re-render for animation
              style={{
                fontSize: '16px',
                lineHeight: '1.5',
                animation: 'fadeIn 0.5s ease-in-out',
                color: 'var(--color-text-primary)'
              }}
            >
              {currentTip}
            </div>
          </div>
        )}

        {/* Debug Info (Development Only) */}
        {import.meta.env.DEV && (
          <div style={{
            marginTop: '20px',
            fontSize: '12px',
            opacity: 0.65,
            fontFamily: 'monospace',
            color: 'var(--color-text-muted)'
          }}>
            Display Time: {(displayTime / 1000).toFixed(1)}s
            {showProgress && ` | Progress: ${progressValue.toFixed(1)}%`}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '50%',
        fontSize: '14px',
        textAlign: 'center',
        transform: `translateX(-50%) ${animationPhase >= 3 ? 'translateY(0)' : 'translateY(20px)'}`,
        opacity: animationPhase >= 3 ? 0.75 : 0,
        transition: 'all 0.5s ease-out 1.4s'
      }}>
        <div style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          🎮 Get ready for the ultimate drift experience
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 0.3; 
            transform: scale(1);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.2);
          }
        }
        
        @keyframes fadeIn {
          0% { 
            opacity: 0; 
            transform: translateY(10px);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        
        @keyframes backgroundFloat {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
          }
          33% { 
            transform: translateY(-10px) rotate(1deg); 
          }
          66% { 
            transform: translateY(-5px) rotate(-1deg); 
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
