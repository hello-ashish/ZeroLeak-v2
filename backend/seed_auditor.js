#!/usr/bin/env node
/**
 * Auditor Seed Script
 * Run: node seed_auditor.js
 * 
 * Creates a demo Auditor account for testing the Auditor Console.
 * This script is NOT production code — it is for local development setup.
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { Auditor } from './src/models/auditor.models.js'
import { AuditLog } from './src/models/auditlog.models.js'

dotenv.config()

const DEMO_AUDITOR = {
    auditorId: 'AUD-001',
    name: 'Platform Auditor',
    email: 'auditor@zeroleak.com',
    password: 'Auditor@2026!'
}

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✓ Connected to MongoDB')

        // Create auditor account
        const existing = await Auditor.findOne({ email: DEMO_AUDITOR.email })
        if (existing) {
            console.log('ℹ Auditor account already exists:', DEMO_AUDITOR.email)
        } else {
            await Auditor.create(DEMO_AUDITOR)
            console.log('✓ Auditor account created:', DEMO_AUDITOR.email)
            console.log('  Password:', DEMO_AUDITOR.password)
        }

        // Log the seed event
        await AuditLog.create({
            actor: 'system',
            actorRole: 'System',
            action: 'AUDITOR_ACCOUNT_CREATED',
            targetType: 'Auditor',
            targetLabel: DEMO_AUDITOR.email,
            details: 'Seed script created demo auditor account'
        })

        console.log('\n✓ Seed complete.')
        console.log('  Login URL: http://localhost:5173/auditor/login')
        console.log('  Email:', DEMO_AUDITOR.email)
        console.log('  Password:', DEMO_AUDITOR.password)
        process.exit(0)
    } catch (error) {
        console.error('✗ Seed failed:', error.message)
        process.exit(1)
    }
}

seed()
