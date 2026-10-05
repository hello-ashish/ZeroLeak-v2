/**
 * ZMailCompose — Full compose window with draft autosave
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Save, ChevronDown, ChevronUp, Paperclip, Minimize2 } from 'lucide-react';
import { ZMailRecipientInput } from './ZMailRecipientInput.jsx';
import {
    sendMessage, createDraft, updateDraft, sendDraft,
} from '../../hooks/useZMail.jsx';
import { useToast } from '../Toast.jsx';
import { useZMail } from '../../hooks/useZMail.jsx';

const AUTOSAVE_DELAY = 3000; // 3 seconds debounce

export function ZMailCompose({
    onClose,
    onSent,
    initialTo = [],
    initialSubject = '',
    initialBody = '',
    replyToMessageId = null,
    existingDraftId = null,
    existingDraftVersion = 0,
    minimizable = true,
}) {
    const [to, setTo] = useState(initialTo);
    const [cc, setCc] = useState([]);
    const [bcc, setBcc] = useState([]);
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [sending, setSending] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draftId, setDraftId] = useState(existingDraftId);
    const [draftVersion, setDraftVersion] = useState(existingDraftVersion);
    const [attachments, setAttachments] = useState([]);
    const autosaveRef = useRef(null);
    const fileInputRef = useRef(null);
    const toast = useToast();
    const { refreshCounts } = useZMail();

    // Autosave draft
    const saveDraft = useCallback(async () => {
        if (sending) return;
        setSaving(true);
        try {
            const payload = { to, cc, bcc, subject, body, attachments };
            if (draftId) {
                const res = await updateDraft(draftId, { ...payload, version: draftVersion });
                if (res.success) setDraftVersion(res.version);
            } else {
                const res = await createDraft(payload);
                if (res.success) {
                    setDraftId(res.draftId);
                    setDraftVersion(1);
                }
            }
            refreshCounts();
        } catch { /* silently ignore autosave errors */ }
        setSaving(false);
    }, [to, cc, bcc, subject, body, attachments, draftId, draftVersion, sending, refreshCounts]);

    // Debounce autosave whenever compose fields change
    useEffect(() => {
        clearTimeout(autosaveRef.current);
        autosaveRef.current = setTimeout(saveDraft, AUTOSAVE_DELAY);
        return () => clearTimeout(autosaveRef.current);
    }, [to, cc, bcc, subject, body]);

    const handleSend = async () => {
        if (!to || to.length === 0) {
            toast.error('Please add at least one recipient.');
            return;
        }
        if (!body.trim()) {
            toast.error('Message body cannot be empty.');
            return;
        }
        setSending(true);
        clearTimeout(autosaveRef.current);
        try {
            if (draftId) {
                await sendDraft(draftId);
            } else {
                await sendMessage({ to, cc, bcc, subject, body, attachments, replyToMessageId });
            }
            toast.success('Message sent!');
            refreshCounts();
            onSent && onSent();
            onClose();
        } catch (e) {
            console.error('[ZMail] Send failed:', e?.response?.status, e?.response?.data, e?.message);
            toast.error(e?.response?.data?.error || e?.message || 'Failed to send message. Please try again.');
        }
        setSending(false);
    };

    const handleDiscard = async () => {
        clearTimeout(autosaveRef.current);
        if (draftId) {
            try {
                const { deleteDraft } = await import('../../hooks/useZMail.jsx');
                await deleteDraft(draftId);
                refreshCounts();
            } catch { /* ignore */ }
        }
        onClose();
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (attachments.length + files.length > 10) {
            toast.warning('Maximum 10 attachments allowed.');
            return;
        }
        for (const file of files) {
            if (file.size > 25 * 1024 * 1024) {
                toast.warning(`File "${file.name}" exceeds 25 MB limit.`);
                continue;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64data = ev.target.result.split(',')[1];
                const att = {
                    originalName: file.name,
                    storageName: file.name,
                    storageKey: `local:${file.name}`, // uploaded later
                    mimeType: file.type || 'application/octet-stream',
                    sizeBytes: file.size,
                    base64data,
                    uploadedAt: new Date().toISOString(),
                };
                setAttachments(prev => [...prev, att]);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    if (minimized) {
        return (
            <div className="zmail-compose-minimized" onClick={() => setMinimized(false)} role="button" tabIndex={0}>
                <span>New Message</span>
                {saving && <span className="zmail-saving-dot" title="Saving...">●</span>}
                <button type="button" onClick={e => { e.stopPropagation(); onClose(); }} aria-label="Close">
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className="zmail-compose-window" role="dialog" aria-label="Compose email" aria-modal="true">
            {/* Header */}
            <div className="zmail-compose-header">
                <span className="zmail-compose-title">New Message</span>
                <div className="zmail-compose-header-actions">
                    {saving && <span className="zmail-saving-text">Saving...</span>}
                    {minimizable && (
                        <button type="button" onClick={() => setMinimized(true)} aria-label="Minimize" className="zmail-compose-action-btn">
                            <Minimize2 size={16} />
                        </button>
                    )}
                    <button type="button" onClick={handleDiscard} aria-label="Discard draft" className="zmail-compose-action-btn">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Recipients */}
            <div className="zmail-compose-fields">
                <ZMailRecipientInput label="To" value={to} onChange={setTo} placeholder="recipient@zeroleak.com" />

                {showCc && (
                    <ZMailRecipientInput label="Cc" value={cc} onChange={setCc} placeholder="cc@zeroleak.com" />
                )}
                {showBcc && (
                    <ZMailRecipientInput label="Bcc" value={bcc} onChange={setBcc} placeholder="bcc@zeroleak.com" />
                )}

                <div className="zmail-compose-cc-toggle">
                    {!showCc && (
                        <button type="button" onClick={() => setShowCc(true)} className="zmail-toggle-link">
                            Cc
                        </button>
                    )}
                    {!showBcc && (
                        <button type="button" onClick={() => setShowBcc(true)} className="zmail-toggle-link">
                            Bcc
                        </button>
                    )}
                </div>

                <div className="zmail-compose-subject-row">
                    <input
                        className="zmail-compose-subject"
                        type="text"
                        placeholder="Subject"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        maxLength={998}
                        aria-label="Subject"
                    />
                </div>
            </div>

            {/* Body */}
            <textarea
                className="zmail-compose-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your message here..."
                aria-label="Message body"
            />

            {/* Attachments preview */}
            {attachments.length > 0 && (
                <div className="zmail-compose-attachments">
                    {attachments.map((att, i) => (
                        <div key={i} className="zmail-compose-attachment-chip">
                            <Paperclip size={12} />
                            <span>{att.originalName}</span>
                            <button
                                type="button"
                                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                aria-label={`Remove ${att.originalName}`}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer actions */}
            <div className="zmail-compose-footer">
                <button
                    className="btn btn-primary zmail-send-btn"
                    onClick={handleSend}
                    disabled={sending}
                    aria-label="Send message"
                    id="zmail-send-btn"
                >
                    <Send size={16} />
                    {sending ? 'Sending...' : 'Send'}
                </button>

                <button
                    type="button"
                    className="topbar-btn"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach file"
                    title="Attach file"
                >
                    <Paperclip size={18} />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    multiple
                    onChange={handleFileSelect}
                    aria-label="Select file to attach"
                />

                <button
                    type="button"
                    className="topbar-btn"
                    onClick={() => { clearTimeout(autosaveRef.current); saveDraft(); }}
                    aria-label="Save draft"
                    title="Save draft"
                    disabled={saving}
                >
                    <Save size={18} />
                </button>
            </div>
        </div>
    );
}
