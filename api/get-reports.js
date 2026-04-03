import { Octokit } from "@octokit/rest";
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'summary';
  const group = searchParams.get('group');
  const section = searchParams.get('section');
  const studentId = searchParams.get('studentId');
  const period = searchParams.get('period') || 'week';
  const start = searchParams.get('startDate');
  const end = searchParams.get('endDate');

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  try {
    // ✅ قراءة مجلد attendance_logs مباشرة (أضمن من getTree)
    let files = [];
    try {
      const res = await octokit.repos.getContent({ owner, repo, path: 'attendance_logs' });
      files = Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      if (e.status !== 404) throw e; // 404 يعني أن المجلد فارغ أو غير موجود بعد
    }

    const jsonFiles = files.filter(f => f.name?.endsWith('.json') && f.type === 'file');
    let records = [];

    for (const file of jsonFiles) {
      try {
        const { data: content } = await octokit.repos.getContent({
          owner, repo, path: file.path
        });
        const raw = JSON.parse(Buffer.from(content.content, 'base64').toString('utf-8'));
        records.push({
          date: raw.date || '',
          group: raw.group || '',
          section_id: raw.section_id || '',
          section: raw.section || '',
          total: Number(raw.total_students) || 0,
          absent: Number(raw.absent_count) || 0,
          absentIds: Array.isArray(raw.absent_students) ? raw.absent_students : [],
          absentNames: Array.isArray(raw.absent_names) ? raw.absent_names : []
        });
      } catch { continue; }
    }

    // 🔍 تصفية البيانات
    if (group) records = records.filter(r => r.group === group);
    if (section) records = records.filter(r => r.section_id === section || r.section.includes(section));
    
    if (start && end) {
      records = records.filter(r => r.date >= start && r.date <= end);
    } else if (period === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      records = records.filter(r => new Date(r.date) >= d);
    } else if (period === 'month') {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      records = records.filter(r => new Date(r.date) >= d);
    }

    // 📊 معالجة الطلبات
    if (action === 'student-history' && studentId) {
      const history = records
        .filter(r => r.absentIds.includes(studentId))
        .map(r => ({ date: r.date, section: r.section || r.section_id, group: r.group }));
      return new Response(JSON.stringify({ success: true,  history }), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      });
    }

    const summary = {
      totalDays: new Set(records.map(r => r.date)).size,
      totalStudents: records.reduce((sum, r) => sum + r.total, 0),
      totalAbsent: records.reduce((sum, r) => sum + r.absent, 0),
      dailyData: [],
      sectionData: []
    };
    summary.avgRate = summary.totalStudents > 0 ? ((summary.totalAbsent / summary.totalStudents) * 100).toFixed(1) : 0;

    const dayMap = {};
    records.forEach(r => {
      if (!dayMap[r.date]) dayMap[r.date] = { date: r.date, absent: 0, total: 0 };
      dayMap[r.date].absent += r.absent;
      dayMap[r.date].total += r.total;
    });
    summary.dailyData = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    const secMap = {};
    records.forEach(r => {
      const key = r.section_id || r.section || 'غير محدد';
      if (!secMap[key]) secMap[key] = { section: key, absent: 0, total: 0 };
      secMap[key].absent += r.absent;
      secMap[key].total += r.total;
    });
    summary.sectionData = Object.values(secMap)
      .map(s => ({ ...s, rate: s.total > 0 ? ((s.absent/s.total)*100).toFixed(1) : 0 }))
      .sort((a, b) => b.absent - a.absent);

    return new Response(JSON.stringify({ success: true,  summary }), { 
      status: 200, headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Reports API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
