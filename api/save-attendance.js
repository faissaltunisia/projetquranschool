// api/save-attendance.js
import { Octokit } from "@octokit/rest";
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let data;
  try { data = await req.json(); } 
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  
  if (!owner || !repo) {
    return new Response(JSON.stringify({ error: 'Missing GITHUB env vars' }), { status: 500 });
  }

  const fileName = `attendance_logs/attendance_${data.date}_${data.group}.json`;

  try {
    // محاولة جلب الملف الحالي للحصول على sha (مطلوب للتحديث)
    let sha = null;
    try {
      const { data: existing } = await octokit.repos.getContent({ 
        owner, repo, path: fileName 
      });
      sha = existing.sha;
    } catch (e) {
      if (e.status !== 404) throw e; // 404 = ملف جديد، مقبول
    }

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path: fileName,
      message: `Attendance ${data.date} - Group ${data.group} - Section ${data.section || ''}`,
      content,
      ...(sha && { sha }) // إرسال sha فقط إذا كان الملف موجوداً
    });

    return new Response(JSON.stringify({ 
      success: true, 
      saved: data.absent_count,
      group: data.group,
      section: data.section
    }), { status: 200 });

  } catch (error) {
    console.error('GitHub Save Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
