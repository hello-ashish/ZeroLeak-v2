import React from "react";

// BrowserRouter: This wraps our entire app. It listens to the browser's URL bar (like /admin/dashboard) and keeps our UI in sync with the URL.
// Routes: A container that holds all our individual Route definitions. It looks through them and renders the first one that matches the current URL.
// Route: Defines a single path (like path="/") and tells React which component to render (element={<AdminLogin />}) when the URL matches.
import { BrowserRouter, Routes, Route} from "react-router-dom"

import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard"
import './index.css'
import ProfessorDashboard from "./ProfessorDashboard";
import ProfessorLogin from "./professorLogin"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Routes */}
        <Route path="/" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Professor Routes */}
        <Route path="/professor/login" element={<ProfessorLogin />} />
        <Route path="/professor/dashboard" element={<ProfessorDashboard />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App