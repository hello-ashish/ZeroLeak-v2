import React from "react";
import { BrowserRouter, Routes, Route} from "react-router-dom"

import Home from './Home'
import AdminLogin from './AdminLogin'
import AdminDashboard from './AdminDashboard'
import ProfessorLogin from './ProfessorLogin'
import ProfessorDashboard from './ProfessorDashboard'
import StudentLogin from './StudentLogin'
import StudentDashboard from './StudentDashboard'
import TakeExam from './TakeExam'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Professor Routes */}
        <Route path="/professor/login" element={<ProfessorLogin />} />
        <Route path="/professor/dashboard" element={<ProfessorDashboard />} />

        {/* Student Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/take-exam/:id" element={<TakeExam />} />
        
      </Routes>
    </BrowserRouter>
  )
}

export default App