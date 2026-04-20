const { generateStandupDraft } = require('../../services/standupGenerator');

describe('standupGenerator', () => {
  const mockActivity = {
    commits: [
      { message: 'fix auth bug', repo: 'org/backend', url: 'https://github.com', date: new Date().toISOString() },
      { message: 'add rate limiting', repo: 'org/backend', url: 'https://github.com', date: new Date().toISOString() },
      { message: 'fix auth bug', repo: 'org/backend', url: 'https://github.com', date: new Date().toISOString() }, // duplicate
    ],
    prs: [
      {
        title: 'Add Redis caching',
        repo: 'org/backend',
        url: 'https://github.com/org/backend/pull/1',
        state: 'open',
        draft: false,
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), 
      },
      {
        title: 'Fix JWT expiry',
        repo: 'org/auth',
        url: 'https://github.com/org/auth/pull/2',
        state: 'open',
        draft: true,
        updatedAt: new Date().toISOString(), 
      },
    ],
    reviews: [
      { title: 'Update docs', repo: 'org/docs', url: 'https://github.com', state: 'open', updatedAt: new Date().toISOString() },
    ],
  };

  test('generates yesterday section from commits', () => {
    const draft = generateStandupDraft(mockActivity);
    expect(draft.yesterday).toBeTruthy();
    expect(draft.yesterday).toContain('backend');
  });

  test('deduplicates similar commit messages', () => {
    const draft = generateStandupDraft(mockActivity);
    const backendOccurrences = (draft.yesterday.match(/fix auth bug/g) || []).length;
    expect(backendOccurrences).toBeLessThanOrEqual(1);
  });

  test('generates today section from open PRs', () => {
    const draft = generateStandupDraft(mockActivity);
    expect(draft.today).toBeTruthy();
  });

  test('detects stale PRs as blockers', () => {
    const draft = generateStandupDraft(mockActivity);
    expect(draft.blockers).toContain('Add Redis caching');
  });

  test('returns None for blockers when all PRs are fresh', () => {
    const freshActivity = {
      ...mockActivity,
      prs: [{ ...mockActivity.prs[0], updatedAt: new Date().toISOString() }],
    };
    const draft = generateStandupDraft(freshActivity);
    expect(draft.blockers).toBe('None');
  });

  test('handles empty activity gracefully', () => {
    const emptyActivity = { commits: [], prs: [], reviews: [] };
    const draft = generateStandupDraft(emptyActivity);
    expect(draft.yesterday).toBeTruthy();
    expect(draft.today).toBeTruthy();
    expect(draft.blockers).toBeTruthy();
  });

  test('includes review activity in yesterday section', () => {
    const draft = generateStandupDraft(mockActivity);
    expect(draft.yesterday).toContain('eview');
  });
});