import { Octokit } from "@octokit/rest";

export const config = { runtime: 'edge' };

export default async function handler() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const repo = process.env.GITHUB_REPO;
  const owner = process.env.GITHUB_OWNER;

  try {
    const { data } = await octokit.repos.getContent({ 
      owner, 
      repo, 
      path: 'attendance_logs' 
    });
    
    const files = data.filter(f => f.name.endsWith('.json'));
    const records = [];
    
    for (const file of files) {
      try {
        const content = await octokit.repos.getContent({ 
          owner, 
          repo, 
          path: file.path 
        });
        const json = JSON.parse(
          Buffer.from(content.data.content, 'base64').toString('utf-8')
        );
        records.push(json);
      } catch (e) {
        console.error(`Error reading ${file.name}:`, e);
      }
    }
    
    return new Response(JSON.stringify(records), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, records: [] }), { status: 500 });
  }
}
