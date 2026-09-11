import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Eye, Activity, User, GraduationCap, Settings } from 'lucide-react';
import './Home.css';

const Home = () => {
  return (
    <div className="home-wrapper">
      <div className="home-container">

        {/* Left Information Section */}
        <div className="home-info-section">
          <img src="/logo.png" alt="ZeroLeak Logo" style={{ width: 80, height: 80, borderRadius: 20, objectFit: 'cover', marginBottom: 16, boxShadow: '0 8px 24px rgba(88, 101, 242, 0.4)' }} />
          <h1 className="brand-title">ZeroLeak</h1>
          <p className="brand-subtitle">The Ultimate Secure Exam Platform</p>

          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={24} />
              </div>
              <div className="feature-text">
                <h3>Ironclad Security</h3>
                <p>Advanced anti-cheat mechanisms ensure the integrity of every examination session.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <Eye size={24} />
              </div>
              <div className="feature-text">
                <h3>Real-time Monitoring</h3>
                <p>AI-powered proctoring keeps a watchful eye on candidates throughout the test.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <Activity size={24} />
              </div>
              <div className="feature-text">
                <h3>Deep Analytics</h3>
                <p>Comprehensive reports and insights into student performance and behavior.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Section */}
        <div className="home-login-section">
          <div className="login-card">
            <h2>Welcome Back</h2>

            <div className="login-buttons">
              <Link to="/student/login" className="login-btn btn-student">
                <User size={20} />
                I am a Student
              </Link>

              <Link to="/professor/login" className="login-btn btn-professor">
                <GraduationCap size={20} />
                I am a Professor
              </Link>

              <Link to="/admin/login" className="login-btn btn-admin">
                <Settings size={20} />
                Admin Portal
              </Link>
              <Link to="/auditor/login" className="login-btn btn-admin">
                <Settings size={20} />
                Audit Portal
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;
