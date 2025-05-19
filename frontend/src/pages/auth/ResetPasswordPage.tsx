import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Auth.css';

const ResetPasswordPage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { token } = useParams();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/auth/reset-password`, {
                token,
                password
            });

            toast.success('Password has been reset successfully');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error resetting password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>Reset Password</h2>
                <p className="auth-subtitle">
                    Please enter your new password below.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="password">New Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter new password"
                            minLength={6}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm new password"
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className={`btn ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>

                    <div className="auth-links">
                        <a href="/login" className="back-to-login">
                            Back to Login
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage; 