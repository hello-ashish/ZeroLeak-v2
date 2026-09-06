import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { LayoutDashboard, Users, GraduationCap, ClipboardList, Database, PackageOpen, BarChart3, Settings, Plus, UserPlus } from 'lucide-react'

export const CommandPalette = ({ open, onClose }) => {
    const navigate = useNavigate()

    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                onClose(v => !v)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const handleSelect = (path) => {
        navigate(path)
        onClose(false)
    }

    return (
        <Command.Dialog 
            open={open} 
            onOpenChange={onClose} 
            label="Global Command Menu"
            className="command-dialog"
        >
            <div className="command-palette-content">
                <div className="command-input-wrap">
                    <Command.Input placeholder="Search students, exams, questions or commands..." className="command-input" autoFocus />
                </div>
                
                <Command.List className="command-results">
                    <Command.Empty>No results found.</Command.Empty>

                    <Command.Group heading="Navigation">
                        <Command.Item onSelect={() => handleSelect('/admin/dashboard')}>
                            <LayoutDashboard size={16} /> Dashboard
                        </Command.Item>
                        <Command.Item onSelect={() => handleSelect('/admin/exams')}>
                            <ClipboardList size={16} /> Exams
                        </Command.Item>
                        <Command.Item onSelect={() => handleSelect('/admin/questions')}>
                            <Database size={16} /> Question Bank
                        </Command.Item>
                        <Command.Item onSelect={() => handleSelect('/admin/students')}>
                            <GraduationCap size={16} /> Students
                        </Command.Item>
                        <Command.Item onSelect={() => handleSelect('/admin/professors')}>
                            <Users size={16} /> Professors
                        </Command.Item>
                        <Command.Item onSelect={() => handleSelect('/admin/batches')}>
                            <PackageOpen size={16} /> Batch Review
                        </Command.Item>
                        <Command.Item onSelect={() => handleSelect('/admin/gradebook')}>
                            <BarChart3 size={16} /> Gradebook
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Quick Actions">
                        <Command.Item onSelect={() => handleSelect('/admin/exams')}>
                            <Plus size={16} /> Create New Exam
                        </Command.Item>
                        <Command.Item onSelect={() => handleSelect('/admin/students')}>
                            <UserPlus size={16} /> Add Student
                        </Command.Item>
                        <Command.Item onSelect={() => handleSelect('/admin/settings')}>
                            <Settings size={16} /> System Settings
                        </Command.Item>
                    </Command.Group>
                </Command.List>
            </div>
        </Command.Dialog>
    )
}
