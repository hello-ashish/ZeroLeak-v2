import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon } from 'lucide-react';
import { applyThemeProgress } from '../utils/themeEngine.js';
import './GlobalThemeSlider.css';

const GlobalThemeSlider = () => {
  const [themeProgress, setThemeProgress] = useState(() => {
    return localStorage.getItem('themeProgress') || 0;
  });
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);

  // Apply theme progress globally on load and when it changes
  useEffect(() => {
    applyThemeProgress(themeProgress);
    localStorage.setItem('themeProgress', themeProgress);
  }, [themeProgress]);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 4000); // Hide after 4 seconds of inactivity
  };

  const handleToggleClick = () => {
    setIsVisible(prev => {
      if (!prev) {
        resetTimeout();
        return true;
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return false;
      }
    });
  };

  useEffect(() => {
    window.addEventListener('zl-theme-slider-toggle', handleToggleClick);
    return () => window.removeEventListener('zl-theme-slider-toggle', handleToggleClick);
  }, []);

  const handleChange = (e) => {
    setThemeProgress(e.target.value);
    resetTimeout();
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (isVisible) {
      resetTimeout();
    }
  };

  return (
    <div 
      className={`global-theme-controller ${isVisible ? 'slider-visible' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        className="theme-toggle-btn" 
        onClick={handleToggleClick}
        aria-label="Toggle Brightness Slider"
      >
        {themeProgress > 50 ? <Sun size={20} className="active-icon sun" /> : <Moon size={20} className="active-icon moon" />}
      </button>

      <div className="theme-slider-container">
        <Sun size={18} className="slider-icon sun-icon" />
        <div className="slider-track-wrapper">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={themeProgress} 
            onChange={handleChange}
            className="theme-vertical-slider"
            aria-label="Adjust App Brightness"
          />
        </div>
        <Moon size={18} className="slider-icon moon-icon" />
      </div>
    </div>
  );
};

export default GlobalThemeSlider;
