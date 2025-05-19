import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import { toast } from 'react-toastify';
import './Auth.css';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.post(`/auth/forgot-password`, {
                email
            });

            toast.success('Password reset link has been sent to your email');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error processing request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>Forgot Password</h2>
                <p className="auth-subtitle">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                        />
                    </div>

                    <button
                        type="submit"
                        className={`btn ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPasswordPage; 