const deduplicateCommits = (commits) => {
    const byRepo = {};
  
    commits.forEach(({ message, repo }) => {
      if (!byRepo[repo]) byRepo[repo] = new Set();
      const normalized = message.toLowerCase().replace(/#\d+/g, '').trim();
      byRepo[repo].add(normalized);
    });
  
    return Object.entries(byRepo).map(([repo, messages]) => {
      const repoName = repo.split('/')[1]; 
      const items = [...messages].slice(0, 3); 
      return `${repoName}: ${items.join(', ')}`;
    });
  };
  
  const generateStandupDraft = (activity) => {
    const { commits, prs, reviews } = activity;
  
    const yesterdayLines = [];
  
    if (commits.length > 0) {
      const deduplicated = deduplicateCommits(commits);
      deduplicated.forEach((line) => yesterdayLines.push(`• ${line}`));
    }
  
    if (reviews.length > 0) {
      const reviewedRepos = [...new Set(reviews.map((r) => r.repo.split('/')[1]))];
      yesterdayLines.push(`Reviewed PRs in: ${reviewedRepos.join(', ')}`);
    }
  
    const yesterday =
      yesterdayLines.length > 0
        ? yesterdayLines.join('\n')
        : 'No GitHub activity found for yesterday.';
  
 
    const openPRs = prs.filter((pr) => pr.state === 'open');
    const draftPRs = openPRs.filter((pr) => pr.draft);
    const readyPRs = openPRs.filter((pr) => !pr.draft);
  
    const todayLines = [];
  
    if (draftPRs.length > 0) {
      draftPRs.forEach((pr) => {
        todayLines.push(`• Continue work on: ${pr.title} (${pr.repo.split('/')[1]})`);
      });
    }
  
    if (readyPRs.length > 0) {
      readyPRs.forEach((pr) => {
        todayLines.push(`• Follow up on PR: ${pr.title} (${pr.repo.split('/')[1]})`);
      });
    }
  
    const today =
      todayLines.length > 0
        ? todayLines.join('\n')
        : 'No open PRs detected — add what you plan to work on.';
  

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
    const stalePRs = openPRs.filter(
      (pr) => new Date(pr.updatedAt) < twoDaysAgo
    );
  
    const blockers =
      stalePRs.length > 0
        ? stalePRs
            .map((pr) => `• Waiting on review: ${pr.title} (${pr.repo.split('/')[1]})`)
            .join('\n')
        : 'None';
  
    return { yesterday, today, blockers };
  };
  
module.exports = { generateStandupDraft };