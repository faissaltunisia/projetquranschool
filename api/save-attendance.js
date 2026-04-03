import { Octokit } from "@octokit/rest";
export const config = { runtime: 'edge' };

function deepTrim(obj) {
  if (typeof obj === 'string') return obj.trim();
  if (Array.isArray(obj)) return obj.map(deepTrim);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.trim(), deepTrim(v)]));
  }
  return obj;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let data;
  try { data = await req.json(); } 
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  data = deepTrim(data);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const fileName = `attendance_logs/attendance_${data.date || 'unknown'}_${data.group || 'unknown'}.json`;

  try {
    let sha = null;
    try {
      const { data: existing } = await octokit.repos.getContent({ owner, repo, path: fileName });
      sha = existing.sha;
    } catch (e) {
      if (e.status !== 404) throw e;
    }

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path: fileName,
      message: `Attendance ${data.date} - Group ${data.group}`,
      content,
      ...(sha && { sha })
    });

    return new Response(JSON.stringify({ 
      success: true, 
      saved: data.absent_count, 
      group: data.group 
    }), { status: 200 });

  } catch (error) {
    console.error('GitHub Save Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
