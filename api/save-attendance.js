import { Octokit } from "@octokit/rest";
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  
  let data;
  try { data = await req.json(); } 
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  // إنشاء اسم ملف مستقل لكل شعبة يومياً
  const safeSectionId = (data.section_id || 'unknown').trim().replace(/\s+/g, '_');
  const fileName = `attendance_logs/attendance_${data.date}_${data.group}_${safeSectionId}.json`;

  try {
    // التحقق من وجود الملف وجلب sha للتحديث الآمن
    let existingSha = null;
    try {
      const { data: existing } = await octokit.repos.getContent({ owner, repo, path: fileName });
      existingSha = existing.sha;
    } catch (e) { if (e.status !== 404) throw e; }

    // تنبيه إذا وُجد ملف سابق ولم يطلب المستخدم التعديل
    if (existingSha && !data.overwrite) {
      return new Response(JSON.stringify({
        exists: true,
        message: `⚠️ يوجد سجل محفوظ اليوم (${data.date}) للشعبة: ${data.section}\nهل تريد تعديل البيانات الحالية؟`
      }), { status: 200 });
    }

    // تنظيف البيانات من الحقول الداخلية قبل الحفظ
    const cleanData = { ...data };
    delete cleanData.overwrite;
    delete cleanData.sha;

    const content = Buffer.from(JSON.stringify(cleanData, null, 2)).toString('base64');
    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path: fileName,
      message: `Attendance ${data.date} - ${data.group} - ${safeSectionId}`,
      content,
      ...(existingSha && { sha: existingSha })
    });

    return new Response(JSON.stringify({ success: true, action: existingSha ? 'updated' : 'created' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
