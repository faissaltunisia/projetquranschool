import { Octokit } from "@octokit/rest";

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const body = await req.json();
  const { action, file, student, studentId } = body;
  const repo = process.env.GITHUB_REPO;
  const owner = process.env.GITHUB_OWNER;

  try {
    // جلب الملف الحالي
    const { data } = await octokit.repos.getContent({ 
      owner, 
      repo, 
      path: `api/${file}` 
    });
    
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const json = JSON.parse(content);

    // إضافة طالب جديد
    if (action === 'add') {
      json.students.push({ 
          id: student.id, 
          name: student.name 
      });
    }

    // حفظ الملف المحدث
    await octokit.repos.createOrUpdateFileContents({
      owner, 
      repo, 
      path: `api/${file}`,
      message: `Add student: ${student.name} - ${new Date().toISOString()}`,
      content: Buffer.from(JSON.stringify(json, null, 2)).toString('base64'),
      sha: data.sha
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
