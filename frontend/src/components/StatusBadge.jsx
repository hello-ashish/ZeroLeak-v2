import React from 'react'

export const StatusBadge = ({ status }) => {
    const map = {
        // Exam statuses
        Draft: 'draft',
        Scheduled: 'scheduled',
        Live: 'live',
        Completed: 'completed',
        Archived: 'archived',
        // Batch statuses
        Submitted: 'scheduled',
        Accepted: 'live',
        Rejected: 'danger',
        MarkForReview: 'warning',
        // Generic
        active: 'success',
        inactive: 'neutral',
    }

    const labels = {
        MarkForReview: 'Review',
    }

    const cls = map[status] || 'neutral'
    const dotColors = {
        draft: 'var(--status-draft)',
        scheduled: 'var(--status-scheduled)',
        live: 'var(--status-live)',
        completed: 'var(--status-completed)',
        archived: 'var(--status-archived)',
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        neutral: 'var(--neutral)',
    }

    return (
        <span className={`badge badge-${cls}`}>
            <span className="badge-dot" style={{ background: dotColors[cls] || 'currentColor' }} />
            {labels[status] || status}
        </span>
    )
}

export const DifficultyBadge = ({ level }) => {
    const map = { easy: 'success', medium: 'warning', hard: 'danger' }
    return <span className={`badge badge-${map[level] || 'neutral'}`}>{level}</span>
}

export const ScorePill = ({ score, total }) => {
    if (!total) return <span className="score-pill" style={{ color: 'var(--text-tertiary)' }}>—</span>
    const pct = Math.round((score / total) * 100)
    const cls = pct >= 70 ? 'score-high' : pct >= 50 ? 'score-mid' : 'score-low'
    return <span className={`score-pill ${cls}`}>{pct}%</span>
}
