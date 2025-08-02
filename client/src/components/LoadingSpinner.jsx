import React from 'react';

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = false,
  className = '',
  variant = 'enhanced' // 'enhanced' or 'simple'
}) {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6', 
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const enhancedSpinner = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className} enhanced-spinner-container`}>
      {/* Main 3D Spinner with Ripple Effects */}
      <div className="relative">
        <div className={`enhanced-spinner ${sizeClasses[size]}`}></div>
        <div className={`enhanced-spinner-ripple ${sizeClasses[size]}`}></div>
        <div className={`enhanced-spinner-ripple ${sizeClasses[size]}`}></div>
        <div className={`enhanced-spinner-ripple ${sizeClasses[size]}`}></div>
      </div>
      
      {/* Animated Text */}
      {text && (
        <div className="text-center">
          <p className="enhanced-spinner-text font-medium text-lg">{text}</p>
          {/* Bouncing Dots */}
          <div className="enhanced-spinner-dots">
            <div className="enhanced-spinner-dot"></div>
            <div className="enhanced-spinner-dot"></div>
            <div className="enhanced-spinner-dot"></div>
          </div>
        </div>
      )}
    </div>
  );

  const simpleSpinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`loading loading-spinner ${sizeClasses[size]} text-primary`}></div>
      {text && <p className="text-gray-600 font-medium">{text}</p>}
    </div>
  );

  const spinner = variant === 'enhanced' ? enhancedSpinner : simpleSpinner;

  if (fullScreen) {
    return (
      <div className="fixed inset-0 enhanced-fullscreen flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
} 