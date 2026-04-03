import { Octokit } from "@octokit/rest";
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({error:'Method not allowed'}), {status:405});
  
  let data;
  try { data = await req.json(); } catch { return new Response(JSON.stringify({error:'Invalid JSON'}), {status:400}); }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const fileName = `attendance_logs/attendance_${data.date}_${data.group}.json`;

  try {
    let sha = null;
    try {
      const { data: existing } = await octokit.repos.getContent({ owner, repo, path: fileName });
      sha = existing.sha;
    } catch(e) { if(e.status !== 404) throw e; }

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path: fileName,
      message: `Attendance ${data.date} - Group ${data.group}`,
      content,
      ...(sha && { sha }) // إرسال sha فقط عند التحديث
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
