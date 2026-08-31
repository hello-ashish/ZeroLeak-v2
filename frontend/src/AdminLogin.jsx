import React, { useState } from "react"
import axios from "axios"

const AdminLogin = () => {
    // create 3 state variables for email, password, and error message
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    // runs when user clicks submit button
    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')

        try {
            // axios to send a post request
            const response = await axios.post("http://localhost:4000/api/admin/login", {
                email: email,
                password: password
            })

            // the tokens send by backend
            const token = response.data.token
            const admin = response.data.admin

            localStorage.setItem('adminToken', token)
            alert('Login Successful! Welcome' + admin.email)
        } catch (err) {
            if(err.response){
                setError(err.response.data.message)
            } else {
                setError("Service is not responding")
            }
        }
    }
    return (
        <div className='glass-container'>
            <h1 classname='glass-title'>ZeroLeak</h1>

            <form onSubmit={handleLogin}>

                <div className="imput-group">
                    <label>Admin Email</label>
                    <input
                        type="email"
                        className="glass-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                
                <div className="input-group">
                    <label>Password</label>
                    <input
                        type="password"
                        className="glass-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {error && <p style={{color: 'red', marginBottom: '1rem'}}>{error}</p>}

                <button type="submit" className="glass-button">
                    Login
                </button>
            </form>
        </div>
    )
}

export default AdminLogin