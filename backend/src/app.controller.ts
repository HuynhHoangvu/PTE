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

  @Get('/app-version')
  getAppVersion() {
    return {
      minVersionCode: 1, // Minimum versionCode required to run the app
      latestVersion: '1.1.0',
      forceUpdate: true,
      storeUrl: 'market://details?id=com.flyedu.pte',
      message: 'Có phiên bản ứng dụng mới. Vui lòng cập nhật để tiếp tục sử dụng các tính năng mới nhất!'
    };
  }
}
