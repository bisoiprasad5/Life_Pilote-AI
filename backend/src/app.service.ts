import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'LifePilot API Gateway',
      version: 'v1.0.0',
      timestamp: new Date().toISOString(),
      routes: {
        health: '/api/v1/health',
        auth: {
          register: 'POST /api/v1/auth/register',
          login: 'POST /api/v1/auth/login',
          logout: 'POST /api/v1/auth/logout',
          me: 'GET /api/v1/auth/me',
          profile: 'GET|PATCH /api/v1/auth/profile',
          forgotPassword: 'POST /api/v1/auth/forgot-password',
          resetPassword: 'POST /api/v1/auth/reset-password',
        },
      },
    };
  }
}
