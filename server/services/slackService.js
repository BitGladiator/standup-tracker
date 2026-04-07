const sendStandupToSlack = async (webhookUrl, standup, username) => {
  const text = `*${username}'s standup — ${new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
    }
  )}*
  
  *Yesterday:*
  ${standup.yesterday || "Nothing logged"}
  
  *Today:*
  ${standup.today || "Nothing logged"}
  
  *Blockers:*
  ${standup.blockers || "None"}`;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status}`);
  }

  return true;
};

module.exports = { sendStandupToSlack };
