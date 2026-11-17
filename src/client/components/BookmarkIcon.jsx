import { useState, useEffect } from 'react';

export default function BookmarkIcon({ initialFilled, onToggle }) {
  const [isFilled, setIsFilled] = useState(initialFilled);
  
  const handleClick = () => {
    const nextState = !isFilled;
    setIsFilled(nextState);
    if (onToggle) onToggle(nextState);
  };

  useEffect(() => {
    setIsFilled(initialFilled);
  }, [initialFilled]);

  return (
    <button 
      className={`icon-button ${isFilled ? 'filled' : ''}`} 
      onClick={handleClick}
      aria-label="Bookmark item"
      type="button"
    >
      <svg 
        className="icon-svg" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" 
        />
      </svg>
    </button>
  );
}