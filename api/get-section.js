import { Octokit } from "@octokit/rest";

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const group = searchParams.get('group');

  // تحديد اسم الملف بناءً على المجموعة
  const fileName = group === 'أ' ? 'data/section-a.json' : 'data/section-b.json';

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const repo = process.env.GITHUB_REPO;
  const owner = process.env.GITHUB_OWNER;

  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: fileName });
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'ملف غير موجود' }), { status: 404 });
  }
}
