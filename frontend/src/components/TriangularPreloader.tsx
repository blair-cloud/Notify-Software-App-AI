import React, { useState, useEffect } from 'react';

export interface TriangularPreloaderProps {
  /** Optional custom message list. */
  messages?: string[];
  /** If provided, displays only this static message instead of rotating. */
  message?: string;
  /** Extra class names for outer wrapper. */
  className?: string;
}

const DEFAULT_MESSAGES = [
  'Getting your data...',
  'Connecting to your portal...',
  'Accessing your account...',
  'Checking your information...',
  'Preparing your workspace...',
  'Loading your properties...',
  'Loading your tenants...',
  'Preparing your payments...',
  'Syncing your latest information...',
  'Setting things up for you...',
  'Almost there...',
  'Finishing up...',
  'Almost ready...',
];

export const TriangularPreloader: React.FC<TriangularPreloaderProps> = ({
  messages = DEFAULT_MESSAGES,
  message,
  className = '',
}) => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Rotate messages naturally while loading
  // "Almost ready..." is the final message in the sequence and will stay until data completes
  useEffect(() => {
    if (message || !messages || messages.length <= 1) return;

    const interval = setInterval(() => {
      setFade(false);
      const timer = setTimeout(() => {
        setIndex((prev) => Math.min(prev + 1, messages.length - 1));
        setFade(true);
      }, 200);
      return () => clearTimeout(timer);
    }, 1500);

    return () => clearInterval(interval);
  }, [message, messages]);

  const currentText = message || messages[index];

  return (
    <div
      className={`flex-1 w-full min-h-[calc(100vh-220px)] flex flex-col items-center justify-center select-none text-center my-auto ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Centered minimal preloader container */}
      <div className="flex flex-col items-center justify-center p-6 max-w-xs w-full mx-auto my-auto text-center transition-all">
        {/* Animated 3-dot Triangular Formation */}
        <div className="relative flex items-center justify-center mb-3">
          <svg
            width="36"
            height="32"
            viewBox="0 0 36 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="overflow-visible"
          >
            <style>{`
              /* Slower, deeper pulse effect for dots */
              @keyframes notifyTriangleDotPulse {
                0%, 100% {
                  transform: scale(0.7);
                  opacity: 0.3;
                }
                50% {
                  transform: scale(1.15);
                  opacity: 1;
                }
              }

              /* Smooth, balanced ease-in-out rotation */
              @keyframes rotateTriangleGroup {
                0% { 
                  transform: rotate(0deg); 
                  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); 
                }
                33.33% { 
                  transform: rotate(120deg); 
                  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); 
                }
                66.66% { 
                  transform: rotate(240deg); 
                  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); 
                }
                100% { 
                  transform: rotate(360deg); 
                }
              }

              .tri-spinner-group {
                /* Exact mathematical centroid of the triangle coordinates */
                transform-origin: 18px 19.67px; 
                /* 4.5s rotation matches the 1.5s pulse perfectly (1.5s per 120deg) */
                animation: rotateTriangleGroup 4.5s infinite; 
              }

              .tri-dot-apex {
                transform-origin: 18px 5px;
                animation: notifyTriangleDotPulse 1.5s ease-in-out infinite;
                animation-delay: 0s;
              }
              .tri-dot-bl {
                transform-origin: 7px 27px;
                animation: notifyTriangleDotPulse 1.5s ease-in-out infinite;
                animation-delay: 0.5s;
              }
              .tri-dot-br {
                transform-origin: 29px 27px;
                animation: notifyTriangleDotPulse 1.5s ease-in-out infinite;
                animation-delay: 1.0s;
              }
            `}</style>

            {/* Wrapper group perfectly handles the slow, synchronized rotation */}
            <g className="tri-spinner-group">
              {/* Top Dot (Apex) */}
              <circle
                cx="18"
                cy="5"
                r="3.2"
                fill="#331A6F"
                className="tri-dot-apex"
              />

              {/* Bottom-Left Dot */}
              <circle
                cx="7"
                cy="27"
                r="3.2"
                fill="#331A6F"
                className="tri-dot-bl"
              />

              {/* Bottom-Right Dot */}
              <circle
                cx="29"
                cy="27"
                r="3.2"
                fill="#331A6F"
                className="tri-dot-br"
              />
            </g>
          </svg>
        </div>

        {/* Rotating Feedback Message */}
        <div className="h-5 flex items-center justify-center text-center overflow-hidden">
          <p
            className={`text-xs text-slate-500 font-normal tracking-normal transition-all duration-200 transform ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
              }`}
          >
            {currentText}
          </p>
        </div>
      </div>
    </div>
  );
};