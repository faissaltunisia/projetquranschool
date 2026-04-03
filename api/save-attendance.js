import { Octokit } from "@octokit/rest";
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  let data;
  try { data = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'بيانات غير صالحة' }), { status: 400 }); }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) return new Response(JSON.stringify({ error: 'إعدادات GitHub ناقصة' }), { status: 500 });

  const safeSectionId = (data.section_id || 'unknown').trim().replace(/\s+/g, '_');
  const fileName = `attendance_logs/attendance_${data.date}_${data.group}_${safeSectionId}.json`;

  let existingSha = null;
  try {
    const { data: existing } = await octokit.repos.getContent({ owner, repo, path: fileName });
    existingSha = existing.sha;
  } catch (err) {
    if (err.status !== 404) console.warn('GitHub GetContent Warning:', err.status);
  }

  // تنبيه إذا وُجد ملف ولم يطلب المستخدم التعديل صراحةً
  if (existingSha && !data.overwrite) {
    return new Response(JSON.stringify({
      exists: true,
      message: `⚠️ يوجد سجل محفوظ اليوم للشعبة: ${data.section}\nهل تريد استبدال البيانات الحالية؟`
    }), { status: 200 });
  }

  // تنظيف البيانات الداخلية قبل الحفظ
  const cleanData = { ...data };
  delete cleanData.overwrite;

  const content = Buffer.from(JSON.stringify(cleanData, null, 2)).toString('base64');

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path: fileName,
      message: `Attendance ${data.date} - ${data.group} - ${safeSectionId}`,
      content,
      ...(existingSha && { sha: existingSha }) // إرسال sha فقط عند التحديث
    });
    return new Response(JSON.stringify({ success: true, action: existingSha ? 'updated' : 'created' }), { status: 200 });
  } catch (err) {
    console.error('GitHub Save Error:', err);
    return new Response(JSON.stringify({ 
      error: err.status === 422 ? 'تعارض في الحفظ (جرب مرة أخرى)' : err.message || 'فشل الاتصال بـ GitHub' 
    }), { status: 500 });
  }
}
