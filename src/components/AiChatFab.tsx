import React from 'react';

interface Props {
  onClick: () => void;
  hasUnread?: boolean;
}

export const AiChatFab: React.FC<Props> = ({ onClick, hasUnread = false }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[90] flex items-center group select-none">
      {/* Tooltip Label */}
      <div className="hidden sm:flex items-center mr-3 px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-slate-100 text-xs font-semibold rounded-xl border border-indigo-500/40 shadow-2xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 duration-200 pointer-events-none whitespace-nowrap space-x-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="tracking-wide">AI Copilot</span>
      </div>

      {/* Floating 3D Animated Orb Button */}
      <button
        type="button"
        onClick={onClick}
        title="Open AI Copilot"
        className="relative w-16 h-16 rounded-full flex items-center justify-center focus:outline-none transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer"
        style={{ perspective: '800px' }}
      >
        {/* Ambient Outer Nebula Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 blur-md opacity-60 group-hover:opacity-90 animate-pulse transition-opacity duration-300 pointer-events-none" />

        {/* 3D Gyroscopic Orbital Ring 1 */}
        <div
          className="absolute inset-[-4px] rounded-full border border-sky-400/50 pointer-events-none orb-ring-1"
          style={{
            transformStyle: 'preserve-3d',
            animation: 'orbitSpin1 6s linear infinite'
          }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sky-300 rounded-full shadow-[0_0_8px_#38bdf8]" />
        </div>

        {/* 3D Gyroscopic Orbital Ring 2 */}
        <div
          className="absolute inset-[-4px] rounded-full border border-purple-400/40 pointer-events-none orb-ring-2"
          style={{
            transformStyle: 'preserve-3d',
            animation: 'orbitSpin2 8s linear infinite reverse'
          }}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-purple-300 rounded-full shadow-[0_0_8px_#c084fc]" />
        </div>

        {/* Main 3D Spherical Orb Body */}
        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #67e8f9 0%, #3b82f6 30%, #6366f1 60%, #1e1b4b 95%)',
            boxShadow: `
              inset -5px -5px 12px rgba(15, 23, 42, 0.9),
              inset 4px 4px 10px rgba(255, 255, 255, 0.8),
              0 0 20px rgba(99, 102, 241, 0.5),
              0 8px 16px rgba(0, 0, 0, 0.4)
            `,
            animation: 'orbFloat 3.5s ease-in-out infinite'
          }}
        >
          {/* Swirling Plasma Fluid Inner Layer */}
          <div
            className="absolute inset-0 rounded-full opacity-60 mix-blend-screen pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 60% 70%, rgba(236, 72, 153, 0.8) 0%, transparent 60%), radial-gradient(circle at 30% 20%, rgba(56, 189, 248, 0.9) 0%, transparent 50%)',
              animation: 'plasmaRotate 5s ease-in-out infinite alternate'
            }}
          />

          {/* Top Glass Specular Reflection Highlight */}
          <div
            className="absolute top-1 left-2.5 w-6 h-3 rounded-full bg-white/70 blur-[1px] transform -rotate-25 pointer-events-none"
          />

          {/* Bottom Secondary Glow Light Reflection */}
          <div
            className="absolute bottom-1.5 right-2.5 w-4 h-2 rounded-full bg-indigo-300/40 blur-[2px] transform rotate-15 pointer-events-none"
          />

          {/* Center Glowing AI Core Icon */}
          <div className="relative z-10 text-white text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transform group-hover:rotate-12 transition-transform duration-300">
            <i className="fas fa-wand-magic-sparkles"></i>
          </div>
        </div>

        {/* Pulsing Notification Badge */}
        {hasUnread && (
          <span className="absolute top-0 right-0 flex h-4 w-4 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500 border-2 border-slate-900 shadow"></span>
          </span>
        )}
      </button>

      {/* Embedded CSS Animations for 3D Orb & Gyroscopic Rings */}
      <style>{`
        @keyframes orbFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-5px) rotate(3deg);
          }
        }

        @keyframes orbitSpin1 {
          0% {
            transform: rotateX(65deg) rotateY(20deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(65deg) rotateY(20deg) rotateZ(360deg);
          }
        }

        @keyframes orbitSpin2 {
          0% {
            transform: rotateX(-55deg) rotateY(40deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(-55deg) rotateY(40deg) rotateZ(360deg);
          }
        }

        @keyframes plasmaRotate {
          0% {
            transform: rotate(0deg) scale(1);
          }
          100% {
            transform: rotate(180deg) scale(1.15);
          }
        }
      `}</style>
    </div>
  );
};
