import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, BrainCircuit, Users, ArrowLeft, ShieldAlert } from 'lucide-react';
import './Auth.css';

const AuthShell = ({ title, subtitle, badge, children }) => {
  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {/* Left Information Section */}
        <div className="home-info-section">
          <div className="brand-header">
            <img src="/logo.png" alt="ZeroLeak Logo" className="brand-logo" />
            <div>
              <h1 className="brand-title">ZeroLeak</h1>
              <span className="brand-subtitle">Academic Intelligence Platform</span>
            </div>
          </div>

          <h2 className="brand-statement">Secure every assessment.<br />Understand every outcome.</h2>

          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={20} />
              </div>
              <div className="feature-text">
                <h3>Secure Assessment</h3>
                <p>Integrity for every examination session.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <BrainCircuit size={20} />
              </div>
              <div className="feature-text">
                <h3>Academic Intelligence</h3>
                <p>Comprehensive reports and insights into student performance.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <Users size={20} />
              </div>
              <div className="feature-text">
                <h3>Role-Based Access</h3>
                <p>Dedicated portals for students, professors, and administration.</p>
              </div>
            </div>
          </div>

          <div className="auth-system-status">
            <div className="auth-status-indicator live"></div>
            <span className="auth-status-text">All Systems Operational</span>
          </div>
        </div>

        {/* Right Login Section */}
        <div className="auth-form-section">
          <div className="auth-form-container">
            <Link to="/" className="auth-back-link">
              <ArrowLeft size={16} />
              Back to Workspace Selection
            </Link>

            <div className="auth-form-header">
              <span className="auth-welcome">Welcome Back</span>
              <div className="auth-role-header">
                <h2 className="auth-role-title">{title}</h2>
                {badge && <span className="auth-role-badge">{badge}</span>}
              </div>
              <p className="auth-role-subtitle">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
