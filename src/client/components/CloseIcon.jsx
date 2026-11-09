import React, { useState } from 'react';
import '../public/css/jobApplications.css';

export default function CloseIcon({ initialFilled = false, onToggle }) {
  const [isFilled, setIsFilled] = useState(initialFilled);

  const handleClick = () => {
    const nextState = !isFilled;
    setIsFilled(nextState);
    if (onToggle) onToggle(nextState);
  };

  return (
    <button 
      className={`icon-button ${isFilled ? 'filled' : ''}`} 
      onClick={handleClick}
      aria-label="Close"
      type="button"
    >
      <svg 
        className="icon-svg" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* "X" Cross Paths */}
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}