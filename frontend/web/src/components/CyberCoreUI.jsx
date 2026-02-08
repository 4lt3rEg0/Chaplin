// frontend/web/src/components/CyberCoreUI.jsx
import React from 'react';
import '../styles/cybercore.css';

export const BlenderWindow = ({ title, children, onClose, onMinimize }) => {
    return (
        <div className="blender-window metal-surface">
            <div className="blender-header">
                <div className="window-controls">
                    <div className="control-dot red" onClick={onClose} title="Cerrar"></div>
                    <div className="control-dot yellow" onClick={onMinimize} title="Minimizar"></div>
                    <div className="control-dot green" title="Maximizar"></div>
                </div>
                <span className="window-title">{title}</span>
                <div className="window-actions">
                    <span className="status-indicator blink">█</span>
                </div>
            </div>
            <div className="window-content">
                {children}
            </div>
        </div>
    );
};

export const CyberButton = ({ children, onClick, type = 'default', disabled = false }) => {
    const typeClass = {
        'default': '',
        'primary': 'btn-primary',
        'danger': 'btn-danger',
        'success': 'btn-success'
    }[type];

    return (
        <button
            className={`btn-cyber ${typeClass}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

export const MediaBadge = ({ type }) => {
    const icons = {
        'text': '📝',
        'image': '🖼️',
        'video': '🎬',
        'audio': '🎵'
    };

    const icon = icons[type] || '📎';

    return (
        <div className={`media-badge ${type}`} title={`Tipo: ${type}`}>
            {icon}
        </div>
    );
};

export const PostPanel = ({ post, children }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="post-panel metal-surface">
            <MediaBadge type={post.media_type || 'text'} />

            <div className="post-header">
                <div className="user-avatar-cyber">
                    {post.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="user-info">
                    <div className="username-cyber">{post.username}</div>
                    <div className="post-time">
                        {formatDate(post.created_at)}
                    </div>
                </div>
            </div>

            <div className="post-content-cyber">
                {children}
            </div>

            <div className="post-footer">
                <div className="post-tags">
                    {post.tags && post.tags.split('#').filter(tag => tag.trim()).map((tag, idx) => (
                        <span key={idx} className="cyber-tag">#{tag.trim()}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const AudioPlayerCyber = ({ audioUrl, title }) => {
    return (
        <div className="audio-player-cyber">
            <div className="waveform"></div>
            <div className="audio-controls">
                <CyberButton>
                    <span className="play-icon">▶</span>
                </CyberButton>
                <div className="track-info">
                    <div className="track-title">{title || 'Audio Track'}</div>
                    <div className="track-time">0:00 / 3:45</div>
                </div>
                <div className="volume-control">
                    <span className="volume-icon">🔊</span>
                </div>
            </div>
        </div>
    );
};

export const MemberSinceBadge = ({ registrationDate }) => {
    const calculateDays = (dateString) => {
        const regDate = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - regDate);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const days = calculateDays(registrationDate);
    const date = new Date(registrationDate).toLocaleDateString('es-ES');

    return (
        <div className="member-since-badge">
            <span className="badge-icon">📅</span>
            <span className="badge-text">
                Usuario desde: {date} ({days} días)
            </span>
        </div>
    );
};