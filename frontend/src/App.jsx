import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ToastProvider } from './components/Toast.jsx'
import GlobalThemeSlider from './components/GlobalThemeSlider.jsx'
import './index.css'

// Auth pages (preserved)
import Home from './Home'
import AdminLogin from './AdminLogin'
import AdminProfile from "./AdminProfile"
import ProfessorLogin from './ProfessorLogin'
import { ProfessorLayout } from './pages/professor/ProfessorLayout.jsx'
import ProfessorDashboardPage from './pages/professor/ProfessorDashboardPage.jsx'
import ProfessorBatchesPage from './pages/professor/ProfessorBatchesPage.jsx'
import ProfessorProfile from "./ProfessorProfile"
import StudentLogin from './StudentLogin'
import TakeExam from './TakeExam'
import StudentProfile from "./StudentProfile"

// New Student Command Center pages
import { StudentLayout } from './pages/student/StudentLayout.jsx'
import StudentDashboardPage from './pages/student/StudentDashboardPage.jsx'
import StudentExamsPage from './pages/student/StudentExamsPage.jsx'
import StudentResultsPage from './pages/student/StudentResultsPage.jsx'
import StudentPerformancePage from './pages/student/StudentPerformancePage.jsx'
import StudentSettingsPage from './pages/student/StudentSettingsPage.jsx'

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

// Auditor Console pages
import AuditorLogin from './pages/auditor/AuditorLogin.jsx'
import AuditorDashboardPage from './pages/auditor/AuditorDashboardPage.jsx'
import AuditorAuditExplorerPage from './pages/auditor/AuditorAuditExplorerPage.jsx'
import AuditorAnomaliesPage from './pages/auditor/AuditorAnomaliesPage.jsx'
import AuditorExamsPage from './pages/auditor/AuditorExamsPage.jsx'
import AuditorPeoplePage from './pages/auditor/AuditorPeoplePage.jsx'

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
          <Route element={<ProfessorLayout />}>
              <Route path="/professor/dashboard" element={<ProfessorDashboardPage />} />
              <Route path="/professor/batches" element={<ProfessorBatchesPage />} />
              <Route path="/professor/profile" element={<ProfessorProfile />} />
          </Route>

          {/* ── Student Routes ── */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/take-exam/:id" element={<TakeExam />} />
          <Route element={<StudentLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboardPage />} />
              <Route path="/student/exams" element={<StudentExamsPage />} />
              <Route path="/student/results" element={<StudentResultsPage />} />
              <Route path="/student/performance" element={<StudentPerformancePage />} />
              <Route path="/student/profile" element={<StudentProfile />} />
              <Route path="/student/settings" element={<StudentSettingsPage />} />
          </Route>

          {/* ── Auditor Routes ── */}
          <Route path="/auditor/login" element={<AuditorLogin />} />
          <Route path="/auditor/dashboard" element={<AuditorDashboardPage />} />
          <Route path="/auditor/audit" element={<AuditorAuditExplorerPage />} />
          <Route path="/auditor/anomalies" element={<AuditorAnomaliesPage />} />
          <Route path="/auditor/exams" element={<AuditorExamsPage />} />
          <Route path="/auditor/students" element={<AuditorPeoplePage />} />
          <Route path="/auditor/professors" element={<AuditorPeoplePage />} />

        </Routes>
      </BrowserRouter>
      <GlobalThemeSlider />
    </ToastProvider>
  )
}

export default App