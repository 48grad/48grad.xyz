let commitData = null;

  function renderCommit() {
    if (!commitData) return;
    const lang = document.body.className;
    const label = lang === 'de' ? 'Letzter Commit' : 'Last Commit';
    document.getElementById('commit-hash').textContent =
      `${label}: [${BRANCH}] ${commitData.sha} ${commitData.date}`;
  }

  async function fetchLastCommit() {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`);
      const data = await res.json();
      commitData = { sha: data.sha.substring(0, 7), date: data.commit.author.date.substring(0, 10) };
      renderCommit();
    } catch (e) {}
  }
