import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { applyThemeProgress } from '../utils/themeEngine.js';

export const HeaderThemeToggle = () => {
    const [isDark, setIsDark] = useState(() => {
        const savedProgress = localStorage.getItem('themeProgress');
        // Progress <= 50 is dark mode, > 50 is light mode
        if (savedProgress !== null) {
            return parseInt(savedProgress, 10) <= 50;
        }
        return true; 
    });

    const toggleTheme = () => {
        const nextDark = !isDark;
        setIsDark(nextDark);
        const targetProgress = nextDark ? 0 : 100;
        applyThemeProgress(targetProgress);
        localStorage.setItem('themeProgress', targetProgress);
    };

    return (
        <button
            className="topbar-btn"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
};
