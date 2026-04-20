jest.mock('groq-sdk', () => {
    return jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  overall_score: 82,
                  grade: 'B',
                  clarity_score: 22,
                  specificity_score: 20,
                  blocker_quality_score: 20,
                  completeness_score: 20,
                  clarity_feedback: 'Clear and well structured.',
                  specificity_feedback: 'Good use of specific task names.',
                  blocker_feedback: 'Blocker is actionable.',
                  completeness_feedback: 'All sections filled.',
                  overall_feedback: 'Solid standup. Add ticket numbers for more specificity.',
                }),
              },
            }],
          }),
        },
      },
    }));
  });
  
  const { scoreStandup } = require('../../services/standupScorer');
  
  describe('standupScorer', () => {
    const goodStandup = {
      yesterday: '• Fixed JWT expiry bug — PR #47 merged\n• Reviewed 2 PRs in payments-api',
      today: '• Complete rate limiter — ticket PROJ-234\n• Deploy to staging',
      blockers: '• Waiting on design review for PR #52 — pinged @sarah',
    };
  
    test('returns a score object with all required fields', async () => {
      const score = await scoreStandup(goodStandup);
      expect(score).toHaveProperty('overall_score');
      expect(score).toHaveProperty('grade');
      expect(score).toHaveProperty('clarity_score');
      expect(score).toHaveProperty('specificity_score');
      expect(score).toHaveProperty('blocker_quality_score');
      expect(score).toHaveProperty('completeness_score');
      expect(score).toHaveProperty('overall_feedback');
    });
  
    test('overall score is between 0 and 100', async () => {
      const score = await scoreStandup(goodStandup);
      expect(score.overall_score).toBeGreaterThanOrEqual(0);
      expect(score.overall_score).toBeLessThanOrEqual(100);
    });
  
    test('dimension scores are within valid range', async () => {
      const score = await scoreStandup(goodStandup);
      expect(score.clarity_score).toBeGreaterThanOrEqual(0);
      expect(score.clarity_score).toBeLessThanOrEqual(25);
      expect(score.specificity_score).toBeGreaterThanOrEqual(0);
      expect(score.specificity_score).toBeLessThanOrEqual(25);
    });
  
    test('grade is one of valid values', async () => {
      const score = await scoreStandup(goodStandup);
      expect(['A', 'B', 'C', 'D']).toContain(score.grade);
    });
  });