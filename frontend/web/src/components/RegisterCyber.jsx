import React, { useState } from 'react';
import { BlenderWindow, CyberButton } from './CyberCoreUI';

const RegisterCyber = ({ onClose, onRegister }) => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        firstName: '',
        lastName: '',
        birthDate: '',
        password: '',
        socialGoal: '',
        invitationCode: 'CHA2024' // Código por defecto para primeros usuarios
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onRegister(formData);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="register-modal">
            <BlenderWindow
                title="USER_REGISTRATION.cyb"
                onClose={onClose}
                onMinimize={onClose}
            >
                <form onSubmit={handleSubmit} className="cyber-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="cyber-label">EMAIL_ADDRESS</label>
                            <input
                                type="email"
                                name="email"
                                className="cyber-input"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="user@chaplin.social"
                            />
                        </div>

                        <div className="form-group">
                            <label className="cyber-label">USERNAME</label>
                            <input
                                type="text"
                                name="username"
                                className="cyber-input"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                placeholder="CYBER_USER_001"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="cyber-label">FIRST_NAME</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    className="cyber-input"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="cyber-label">LAST_NAME</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    className="cyber-input"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="cyber-label">BIRTH_DATE</label>
                            <input
                                type="date"
                                name="birthDate"
                                className="cyber-input"
                                value={formData.birthDate}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="cyber-label">INVITATION_CODE</label>
                            <input
                                type="text"
                                name="invitationCode"
                                className="cyber-input"
                                value={formData.invitationCode}
                                onChange={handleChange}
                                required
                                placeholder="CHA2024, Y2KFM, SPIRAL01"
                            />
                        </div>

                        <div className="form-group">
                            <label className="cyber-label">SOCIAL_GOAL</label>
                            <textarea
                                name="socialGoal"
                                className="cyber-textarea"
                                value={formData.socialGoal}
                                onChange={handleChange}
                                required
                                rows="3"
                                placeholder="¿Qué buscas en una red social?"
                            />
                        </div>

                        <div className="form-group">
                            <label className="cyber-label">PASSWORD</label>
                            <input
                                type="password"
                                name="password"
                                className="cyber-input"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength="8"
                            />
                        </div>
                    </div>

                    <div className="form-footer">
                        <div className="status-line">
                            <span className="blink">█</span>
                            <span>READY_FOR_REGISTRATION</span>
                        </div>

                        <div className="form-actions">
                            <CyberButton type="danger" onClick={onClose}>
                                CANCEL
                            </CyberButton>
                            <CyberButton type="success" onClick={handleSubmit}>
                                <i className="fas fa-user-plus"></i>
                                CREATE_ACCOUNT
                            </CyberButton>
                        </div>
                    </div>
                </form>
            </BlenderWindow>
        </div>
    );
};

export default RegisterCyber;