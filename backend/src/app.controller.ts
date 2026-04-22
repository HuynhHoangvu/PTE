import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/')
  getWelcome() {
    return {
      message: 'Fly-Edu PTE Academic Platform API',
      version: '1.0.0',
      status: 'running',
      docs: 'http://localhost:3000/api/docs',
      apiPrefix: '/api',
    };
  }

  @Get('/health')
  getHealth() {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }
}
