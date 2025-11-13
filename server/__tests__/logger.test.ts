/**
 * Logger tests
 */
import { logger } from '../src/utils/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  it('should log info messages', () => {
    logger.info('Test message');
    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('[INFO]');
    expect(loggedMessage).toContain('Test message');
  });

  it('should log info with metadata', () => {
    logger.info('User action', { userId: 123, action: 'login' });
    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('userId');
    expect(loggedMessage).toContain('123');
  });

  it('should log warnings', () => {
    logger.warn('Warning message');
    expect(consoleWarnSpy).toHaveBeenCalled();
    const loggedMessage = consoleWarnSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('[WARN]');
  });

  it('should log errors with Error objects', () => {
    const error = new Error('Test error');
    logger.error('An error occurred', error);
    expect(consoleErrorSpy).toHaveBeenCalled();
    const loggedMessage = consoleErrorSpy.mock.calls[0][0];
    expect(loggedMessage).toContain('[ERROR]');
    expect(loggedMessage).toContain('Test error');
  });

  it('should include timestamp in logs', () => {
    logger.info('Test');
    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    // Check for ISO timestamp format
    expect(loggedMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
