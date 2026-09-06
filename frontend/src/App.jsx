import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ToastProvider } from './components/Toast.jsx'
import './index.css'

// Auth pages (preserved)
import Home from './Home'
import AdminLogin from './AdminLogin'
import AdminProfile from "./AdminProfile"
import ProfessorLogin from './ProfessorLogin'
import ProfessorDashboard from './ProfessorDashboard'
import ProfessorProfile from "./ProfessorProfile"
import StudentLogin from './StudentLogin'
import StudentDashboard from './StudentDashboard'
import TakeExam from './TakeExam'
import StudentProfile from "./StudentProfile"

// New Admin Command Center pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx'
import AdminExamsPage from './pages/admin/AdminExamsPage.jsx'
import { AdminExamBuilderPage } from './pages/admin/AdminExamBuilderPage.jsx'
import { AdminExamDetailPage } from './pages/admin/AdminExamDetailPage.jsx'
import AdminQuestionsPage from './pages/admin/AdminQuestionsPage.jsx'
import AdminStudentsPage from './pages/admin/AdminStudentsPage.jsx'
import AdminProfessorsPage from './pages/admin/AdminProfessorsPage.jsx'
import AdminBatchesPage from './pages/admin/AdminBatchesPage.jsx'
import AdminGradebookPage from './pages/admin/AdminGradebookPage.jsx'
import AdminActivityPage from './pages/admin/AdminActivityPage.jsx'
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* ── Admin Routes (New Command Center) ── */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/profile" element={<AdminProfile />} />

          {/* New dashboard pages */}
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/exams" element={<AdminExamsPage />} />
          <Route path="/admin/exams/create" element={<AdminExamBuilderPage />} />
          <Route path="/admin/exams/:id" element={<AdminExamDetailPage />} />
          <Route path="/admin/questions" element={<AdminQuestionsPage />} />
          <Route path="/admin/students" element={<AdminStudentsPage />} />
          <Route path="/admin/professors" element={<AdminProfessorsPage />} />
          <Route path="/admin/batches" element={<AdminBatchesPage />} />
          <Route path="/admin/gradebook" element={<AdminGradebookPage />} />
          <Route path="/admin/activity" element={<AdminActivityPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />

          {/* Redirect old /admin/dashboard stub if someone navigates there directly */}

          {/* ── Professor Routes ── */}
          <Route path="/professor/login" element={<ProfessorLogin />} />
          <Route path="/professor/dashboard" element={<ProfessorDashboard />} />
          <Route path="/professor/profile" element={<ProfessorProfile />} />

          {/* ── Student Routes ── */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/take-exam/:id" element={<TakeExam />} />
          <Route path="/student/profile" element={<StudentProfile />} />

        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App