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
    // 1️⃣ جلب شجرة الملفات للعثور على ملفات attendance_logs فقط
    const {  tree } = await octokit.git.getTree({
      owner, repo, tree_sha: 'main', recursive: '1'
    });

    const attendanceFiles = tree.tree.filter(f => 
      f.path.startsWith('attendance_logs/') && f.path.endsWith('.json') && f.type === 'blob'
    );

    let records = [];

    // 2️⃣ قراءة كل ملف غياب وتحليله
    for (const file of attendanceFiles) {
      try {
        const {  content } = await octokit.repos.getContent({
          owner, repo, path: file.path
        });
        const record = JSON.parse(Buffer.from(content.content, 'base64').toString('utf-8'));
        
        // تنظيف البيانات وضمان وجود الحقول الأساسية
        records.push({
          date: record.date || '',
          group: record.group || '',
          section_id: record.section_id || '',
          section: record.section || '',
          total: Number(record.total_students) || 0,
          absent: Number(record.absent_count) || 0,
          absentIds: Array.isArray(record.absent_students) ? record.absent_students : [],
          absentNames: Array.isArray(record.absent_names) ? record.absent_names : []
        });
      } catch { continue; }
    }

    // 3️⃣ تصفية حسب المعايير المطلوبة
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

    // 4️⃣ معالجة الطلب حسب النوع
    if (action === 'student-history' && studentId) {
      const history = records
        .filter(r => r.absentIds.includes(studentId))
        .map(r => ({ date: r.date, section: r.section || r.section_id, group: r.group }));
      return new Response(JSON.stringify({ success: true,  history }), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 5️⃣ إحصائيات عامة
    const summary = {
      totalDays: new Set(records.map(r => r.date)).size,
      totalStudents: records.reduce((sum, r) => sum + r.total, 0),
      totalAbsent: records.reduce((sum, r) => sum + r.absent, 0),
      dailyData: [],
      sectionData: []
    };
    summary.avgRate = summary.totalStudents > 0 ? ((summary.totalAbsent / summary.totalStudents) * 100).toFixed(1) : 0;

    // تجميع يومي
    const dayMap = {};
    records.forEach(r => {
      if (!dayMap[r.date]) dayMap[r.date] = { date: r.date, absent: 0, total: 0 };
      dayMap[r.date].absent += r.absent;
      dayMap[r.date].total += r.total;
    });
    summary.dailyData = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    // تجميع حسب الشعبة
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
