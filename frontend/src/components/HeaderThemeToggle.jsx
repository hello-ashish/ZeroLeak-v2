import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { applyThemeProgress } from '../utils/themeEngine.js';

export const HeaderThemeToggle = () => {
    const [isDark, setIsDark] = useState(() => {
        const savedProgress = localStorage.getItem('themeProgress');
        // If progress is >= 50, consider it dark mode, otherwise light.
        if (savedProgress !== null) {
            return parseInt(savedProgress, 10) >= 50;
        }
        // Default to dark mode based on typical app defaults or system preference
        return true; 
    });

    useEffect(() => {
        // Map boolean to 0 (Light) or 100 (Dark) progress
        const targetProgress = isDark ? 100 : 0;
        applyThemeProgress(targetProgress);
        localStorage.setItem('themeProgress', targetProgress);
    }, [isDark]);

    return (
        <button
            className="topbar-btn"
            onClick={() => setIsDark(!isDark)}
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
};
