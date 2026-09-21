import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import { globalLimiter, authLimiter } from '../middlewares/rateLimiter.middleware.js';

describe('Rate Limiter Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        // Reset rate limiter states manually by re-initializing it for tests if needed
        // but express-rate-limit keeps state in memory, so we can just mock it or test the integration directly.
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should block requests exceeding the auth limit', async () => {
        app.post('/login', authLimiter, (req, res) => {
            res.status(200).json({ message: 'Success' });
        });

        const request = supertest(app);
        
        // authLimiter has max 10
        for (let i = 0; i < 10; i++) {
            const res = await request.post('/login').send({});
            expect(res.status).toBe(200);
        }

        // 11th request should be blocked
        const blockedRes = await request.post('/login').send({});
        expect(blockedRes.status).toBe(429);
        expect(blockedRes.body.message).toBe('Too many authentication attempts from this IP, please try again after 15 minutes');
    });

    it('should block requests exceeding the global limit for unauthenticated users', async () => {
        app.get('/api/data', globalLimiter, (req, res) => {
            res.status(200).json({ message: 'Success' });
        });

        const request = supertest(app);
        
        // globalLimiter has max 100
        for (let i = 0; i < 100; i++) {
            await request.get('/api/data');
        }

        // 101st request should be blocked
        const blockedRes = await request.get('/api/data');
        expect(blockedRes.status).toBe(429);
        expect(blockedRes.body.message).toBe('Too many requests from this IP, please try again after 15 minutes');
    });

    it('should skip global limit for authenticated users', async () => {
        // Mock middleware that authenticates the user
        app.use((req, res, next) => {
            req.student = { id: 'student123' };
            next();
        });
        
        app.get('/api/protected', globalLimiter, (req, res) => {
            res.status(200).json({ message: 'Success' });
        });

        const request = supertest(app);
        
        // Even 105 requests should be allowed since it skips
        for (let i = 0; i < 105; i++) {
            const res = await request.get('/api/protected');
            expect(res.status).toBe(200);
        }
    });
});
