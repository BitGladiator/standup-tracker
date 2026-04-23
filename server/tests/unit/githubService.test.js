jest.mock('../../observability/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }));
  
  jest.mock('../../observability/metrics', () => ({
    githubApiCalls: { inc: jest.fn() },
    githubApiDuration: { startTimer: jest.fn(() => jest.fn()) },
    cacheOperations: { inc: jest.fn() },
  }));
  
  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn().mockResolvedValue('OK'),
  };
  jest.mock('../../db/redis', () => mockRedis);
  
  const mockDb = {
    query: jest.fn(),
  };
  jest.mock('../../db', () => mockDb);
  
  global.fetch = jest.fn();
  
  const { fetchGithubActivity } = require('../../services/githubService');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  const mockUser = {
    username: 'testuser',
    access_token: 'test_token',
  };
  
  const mockGithubResponse = (items = []) => ({
    ok: true,
    json: jest.fn().mockResolvedValue({ items }),
  });
  
  describe('githubService', () => {
    describe('fetchGithubActivity — cache hit', () => {
      test('returns cached data when Redis cache exists', async () => {
        const cachedActivity = {
          commits: [{ message: 'cached commit', repo: 'org/repo', url: 'https://github.com', date: new Date().toISOString() }],
          prs: [],
          reviews: [],
        };
  
        mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedActivity));
  
        const result = await fetchGithubActivity(1);
  
        expect(result).toEqual(cachedActivity);
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });
  
    describe('fetchGithubActivity — cache miss', () => {
      beforeEach(() => {
        mockRedis.get.mockResolvedValue(null);
      });
  
      test('fetches from GitHub when cache is empty', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
        mockDb.query.mockResolvedValue({ rows: [] });
        global.fetch.mockResolvedValue(mockGithubResponse([]));
  
        await fetchGithubActivity(1);
  
        expect(global.fetch).toHaveBeenCalledTimes(3); 
      });
  
      test('calls commits search API', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
    mockDb.query.mockResolvedValue({ rows: [] });
        global.fetch.mockResolvedValue(mockGithubResponse([]));
  
        await fetchGithubActivity(1);
  
        const urls = global.fetch.mock.calls.map((c) => c[0]);
        expect(urls.some((url) => url.includes('search/commits'))).toBe(true);
      });
  
      test('calls PRs search API', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
        mockDb.query.mockResolvedValue({ rows: [] });
        global.fetch.mockResolvedValue(mockGithubResponse([]));
  
        await fetchGithubActivity(1);
  
        const urls = global.fetch.mock.calls.map((c) => c[0]);
        expect(urls.some((url) => url.includes('type:pr'))).toBe(true);
      });
  
      test('caches result in Redis after fetch', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
        mockDb.query.mockResolvedValue({ rows: [] });
        global.fetch.mockResolvedValue(mockGithubResponse([]));
  
        await fetchGithubActivity(1);
  
        expect(mockRedis.setex).toHaveBeenCalledWith(
          'github_activity:1',
          expect.any(Number),
          expect.any(String)
        );
      });
  
      test('shapes commit data correctly', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
    mockDb.query.mockResolvedValue({ rows: [] });
        const mockCommit = {
          commit: {
            message: 'fix auth bug\n\ndetailed description',
            committer: { date: new Date().toISOString() },
          },
          repository: { full_name: 'org/backend' },
          html_url: 'https://github.com/org/backend/commit/abc',
        };
  
        global.fetch
          .mockResolvedValueOnce(mockGithubResponse([mockCommit]))
          .mockResolvedValue(mockGithubResponse([]));
  
        const result = await fetchGithubActivity(1);
  
        expect(result.commits[0].message).toBe('fix auth bug'); 
        expect(result.commits[0].repo).toBe('org/backend');
      });
  
      test('throws when user not found in DB', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [] }); 
  
        await expect(fetchGithubActivity(999)).rejects.toThrow('User not found');
      });
  
      test('handles GitHub API error gracefully', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
    mockDb.query.mockResolvedValue({ rows: [] });
        global.fetch.mockResolvedValue({
          ok: false,
          status: 403,
          json: jest.fn().mockResolvedValue({ message: 'Rate limit exceeded' }),
        });
  
        await expect(fetchGithubActivity(1)).rejects.toThrow();
      });
    });
  });