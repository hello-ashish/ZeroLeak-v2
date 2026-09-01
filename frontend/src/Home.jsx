import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="glass-container" style={{ textAlign: 'center' }}>
      <h1 className="glass-title">ZeroLeak</h1>
      <p className="glass-subtitle">Welcome to the Ultimate Exam Platform</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '2rem' }}>
        
        {/* The Link component acts exactly like an <a> tag, but doesn't cause a page reload! */}
        <Link to="/student/login" className="glass-button" style={{textDecoration: 'none', background: 'var(--success)'}}>
          I am a Student
        </Link>
        
        <Link to="/professor/login" className="glass-button" style={{textDecoration: 'none', background: 'var(--accent-primary)'}}>
          I am a Professor
        </Link>
        
        <Link to="/admin/login" className="glass-button" style={{textDecoration: 'none', background: 'rgba(255,255,255,0.1)'}}>
          Admin Portal
        </Link>
        
      </div>
    </div>
  );
};

export default Home;
