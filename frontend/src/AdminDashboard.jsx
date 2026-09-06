// This file redirects to the new admin dashboard page
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AdminDashboard = () => {
    const navigate = useNavigate()
    useEffect(() => {
        navigate('/admin/dashboard', { replace: true })
    }, [navigate])
    return null
}

export default AdminDashboard