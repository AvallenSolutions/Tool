import { describe, it, expect, vi } from 'vitest';
import { logger, logAuth, logAPI, logDatabase } from '../../server/config/logger';

describe('Logger', () => {
  it('should create logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should log API calls with proper format', () => {
    const logSpy = vi.spyOn(logger, 'info');
    
    logAPI('GET', '/api/test', 200, 150, { userId: '123' });
    
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 150,
        userId: '123'
      }),
      'API: GET /api/test 200 (150ms)'
    );
    
    logSpy.mockRestore();
  });

  it('should log auth events with redacted email', () => {
    const logSpy = vi.spyOn(logger, 'info');
    
    logAuth('login', { id: '123', email: 'test@example.com' });
    
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'login',
        userId: '123',
        userEmail: 'tes***@example.com'
      }),
      'Auth: login'
    );
    
    logSpy.mockRestore();
  });
});