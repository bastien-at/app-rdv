
// Mock des variables d'environnement
process.env.JWT_SECRET = 'test-secret';
process.env.BREVO_API_KEY = 'test-api-key';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Silence les logs pendant les tests
global.console = {
  ...console,
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};

// Mock du module DB
jest.mock('../db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  transaction: jest.fn((callback) => callback({ query: jest.fn() })),
  cleanExpiredLocks: jest.fn(),
}));

// Mock du module Email
jest.mock('../utils/email', () => ({
  verifyEmailConfig: jest.fn().mockResolvedValue(true),
  sendBookingRequestEmail: jest.fn(),
  sendConfirmationEmail: jest.fn(),
  sendCancellationEmail: jest.fn(),
  sendReminderEmail: jest.fn(),
}));
