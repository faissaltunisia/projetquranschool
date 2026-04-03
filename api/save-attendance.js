import { Octokit } from "@octokit/rest";

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const data = await req.json();
  const repo = process.env.GITHUB_REPO;
  const owner = process.env.GITHUB_OWNER;
  
  const fileName = `attendance_logs/attendance_${data.date}_${data.group}.json`;

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner, 
      repo, 
      path: fileName,
      message: `Attendance ${data.date} - Group ${data.group}`,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64')
    });
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
