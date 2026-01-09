import nock from 'nock';

// Setup test environment
beforeAll(() => {
  // Disable external HTTP calls in tests
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
});

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.enableNetConnect();
});

// Set test environment
process.env.NODE_ENV = 'test';
process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.TELEGRAM_WEBHOOK_SECRET = 'test-secret';
process.env.ZIVOPAL_CLIENT_ID = 'test-client-id';
process.env.ZIVOPAL_CLIENT_SECRET = 'test-client-secret';
