import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ToastProvider } from './components/Toast.jsx'
import GlobalThemeSlider from './components/GlobalThemeSlider.jsx'
import { SessionReplacedModal } from './components/SessionReplacedModal.jsx'
import { IdleTimer } from './components/IdleTimer.jsx'
import { Loader2 } from 'lucide-react'
import { ZMailProvider } from './hooks/useZMail.jsx'
import './index.css'

// Layouts are kept static to ensure the app shell loads instantly
import { ProfessorLayout } from './pages/professor/ProfessorLayout.jsx'
import { StudentLayout } from './pages/student/StudentLayout.jsx'

// Auth & Public pages
const Home = lazy(() => import('./Home'))
const AdminLogin = lazy(() => import('./AdminLogin'))
const AdminProfile = lazy(() => import('./AdminProfile'))
const ProfessorLogin = lazy(() => import('./professorLogin'))
const ProfessorProfile = lazy(() => import('./ProfessorProfile'))
const StudentLogin = lazy(() => import('./StudentLogin'))
const TakeExam = lazy(() => import('./TakeExam'))
const StudentProfile = lazy(() => import('./StudentProfile'))

// Student pages
const StudentDashboardPage = lazy(() => import('./pages/student/StudentDashboardPage.jsx'))
const StudentExamsPage = lazy(() => import('./pages/student/StudentExamsPage.jsx'))
const StudentResultsPage = lazy(() => import('./pages/student/StudentResultsPage.jsx'))
const StudentPerformancePage = lazy(() => import('./pages/student/StudentPerformancePage.jsx'))
const StudentSettingsPage = lazy(() => import('./pages/student/StudentSettingsPage.jsx'))

// Admin pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'))
const AdminExamsPage = lazy(() => import('./pages/admin/AdminExamsPage.jsx'))
const AdminExamBuilderPage = lazy(() => import('./pages/admin/AdminExamBuilderPage.jsx').then(m => ({ default: m.AdminExamBuilderPage })))
const AdminExamDetailPage = lazy(() => import('./pages/admin/AdminExamDetailPage.jsx').then(m => ({ default: m.AdminExamDetailPage })))
const AdminPaperSimulatorPage = lazy(() => import('./pages/admin/AdminPaperSimulatorPage.jsx').then(m => ({ default: m.AdminPaperSimulatorPage })))
const AdminQuestionsPage = lazy(() => import('./pages/admin/AdminQuestionsPage.jsx'))
const AdminStudentsPage = lazy(() => import('./pages/admin/AdminStudentsPage.jsx'))
const AdminProfessorsPage = lazy(() => import('./pages/admin/AdminProfessorsPage.jsx'))
const AdminBatchesPage = lazy(() => import('./pages/admin/AdminBatchesPage.jsx'))
const AdminGradebookPage = lazy(() => import('./pages/admin/AdminGradebookPage.jsx'))
const AdminActivityPage = lazy(() => import('./pages/admin/AdminActivityPage.jsx'))
const AdminBlockchainCenter = lazy(() => import('./pages/admin/AdminBlockchainCenter.jsx'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage.jsx'))
const AdminFeedbackPage = lazy(() => import('./pages/admin/AdminFeedbackPage.jsx'))
const AdminCheatingDetection = lazy(() => import('./pages/admin/AdminCheatingDetection.jsx'))
const AdminProctoringPage = lazy(() => import('./pages/admin/AdminProctoringPage.jsx').then(m => ({ default: m.AdminProctoringPage })))

// Professor pages
const ProfessorDashboardPage = lazy(() => import('./pages/professor/ProfessorDashboardPage.jsx'))
const ProfessorBatchesPage = lazy(() => import('./pages/professor/ProfessorBatchesPage.jsx'))
const ProfessorCreateBatchPage = lazy(() => import('./pages/professor/ProfessorCreateBatchPage.jsx'))

// Auditor pages
const AuditorLogin = lazy(() => import('./pages/auditor/AuditorLogin.jsx'))
const AuditorDashboardPage = lazy(() => import('./pages/auditor/AuditorDashboardPage.jsx'))
const AuditorAuditExplorerPage = lazy(() => import('./pages/auditor/AuditorAuditExplorerPage.jsx'))
const AuditorAnomaliesPage = lazy(() => import('./pages/auditor/AuditorAnomaliesPage.jsx'))
const AuditorExamsPage = lazy(() => import('./pages/auditor/AuditorExamsPage.jsx'))
const AuditorPeoplePage = lazy(() => import('./pages/auditor/AuditorPeoplePage.jsx'))
const AuditorBlockchainCenter = lazy(() => import('./pages/auditor/AuditorBlockchainCenter.jsx'))
const AuditorSupportPage = lazy(() => import('./pages/auditor/AuditorSupportPage.jsx'))

// ZMail
const ZMailPage = lazy(() => import('./pages/ZMailPage.jsx'))

// Support
const SupportPage = lazy(() => import('./pages/support/SupportPage.jsx'))
const MySupportPage = lazy(() => import('./pages/support/MySupportPage.jsx'))
const SupportLogin = lazy(() => import('./pages/support/SupportLogin.jsx'))

const PageLoader = () => (
  <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
    <Loader2 size={32} color="var(--brand-primary)" className="spin" />
  </div>
)

function App() {
  return (
    <ToastProvider>
      <ZMailProvider>
      <BrowserRouter>
        <SessionReplacedModal />
        <IdleTimer />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />

            {/* ── Admin Routes ── */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/exams" element={<AdminExamsPage />} />
            <Route path="/admin/exams/create" element={<AdminExamBuilderPage />} />
            <Route path="/admin/exams/:id" element={<AdminExamDetailPage />} />
            <Route path="/admin/simulator" element={<AdminPaperSimulatorPage />} />
            <Route path="/admin/questions" element={<AdminQuestionsPage />} />
            <Route path="/admin/students" element={<AdminStudentsPage />} />
            <Route path="/admin/professors" element={<AdminProfessorsPage />} />
            <Route path="/admin/batches" element={<AdminBatchesPage />} />
            <Route path="/admin/gradebook" element={<AdminGradebookPage />} />
            <Route path="/admin/activity" element={<AdminActivityPage />} />
            <Route path="/admin/cheating" element={<AdminCheatingDetection />} />
            <Route path="/admin/proctoring" element={<AdminProctoringPage />} />
            <Route path="/admin/blockchain" element={<AdminBlockchainCenter />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
            
            {/* ── Support Team Route ── */}
            <Route path="/support/login" element={<SupportLogin />} />
            <Route path="/support" element={<SupportPage />} />

            {/* ── Professor Routes ── */}
            <Route path="/professor/login" element={<ProfessorLogin />} />
            <Route element={<ProfessorLayout />}>
              <Route path="/professor/dashboard" element={<ProfessorDashboardPage />} />
              <Route path="/professor/batches" element={<ProfessorBatchesPage />} />
              <Route path="/professor/batches/create" element={<ProfessorCreateBatchPage />} />
              <Route path="/professor/batches/:id/edit" element={<ProfessorCreateBatchPage />} />
              <Route path="/professor/profile" element={<ProfessorProfile />} />
              <Route path="/professor/support" element={<MySupportPage />} />
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
              <Route path="/student/support" element={<MySupportPage />} />
            </Route>

            {/* ── Auditor Routes ── */}
            <Route path="/auditor/login" element={<AuditorLogin />} />
            <Route path="/auditor/dashboard" element={<AuditorDashboardPage />} />
            <Route path="/auditor/audit" element={<AuditorAuditExplorerPage />} />
            <Route path="/auditor/anomalies" element={<AuditorAnomaliesPage />} />
            <Route path="/auditor/exams" element={<AuditorExamsPage />} />
            <Route path="/auditor/students" element={<AuditorPeoplePage />} />
            <Route path="/auditor/professors" element={<AuditorPeoplePage />} />
            <Route path="/auditor/blockchain" element={<AuditorBlockchainCenter />} />
            <Route path="/auditor/support" element={<AuditorSupportPage />} />

            {/* ── ZMail — accessible by all authenticated roles ── */}
            <Route path="/zmail" element={<ZMailPage />} />
            <Route path="/zmail/*" element={<ZMailPage />} />

          </Routes>
        </Suspense>
        <GlobalThemeSlider />
      </BrowserRouter>
      </ZMailProvider>
    </ToastProvider>
  )
}

export default App