import { Octokit } from "@octokit/rest";
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const group = searchParams.get('group');
  const section = searchParams.get('section');
  const studentId = searchParams.get('studentId');
  const period = searchParams.get('period') || 'week'; // week | month
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  try {
    // جلب جميع ملفات الغياب من المجلد
    const {  tree } = await octokit.git.getTree({
      owner, repo, tree_sha: 'main', recursive: '1'
    });

    const attendanceFiles = tree.tree.filter(f => 
      f.path.startsWith('attendance_logs/') && f.path.endsWith('.json')
    );

    let allRecords = [];

    // قراءة كل ملف غياب
    for (const file of attendanceFiles) {
      try {
        const {  content } = await octokit.repos.getContent({
          owner, repo, path: file.path
        });
        const record = JSON.parse(Buffer.from(content.content, 'base64').toString('utf-8'));
        allRecords.push(record);
      } catch (e) { continue; }
    }

    // 🔹 تصفية حسب المعايير
    if (group) allRecords = allRecords.filter(r => r.group === group);
    if (section) allRecords = allRecords.filter(r => r.section_id === section);
    
    if (startDate && endDate) {
      allRecords = allRecords.filter(r => r.date >= startDate && r.date <= endDate);
    } else if (period === 'week') {
      const today = new Date();
      const weekAgo = new Date(today.setDate(today.getDate() - 7));
      allRecords = allRecords.filter(r => new Date(r.date) >= weekAgo);
    } else if (period === 'month') {
      const today = new Date();
      const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
      allRecords = allRecords.filter(r => new Date(r.date) >= monthAgo);
    }

    // 🔹 معالجة حسب نوع الطلب
    if (action === 'student-history' && studentId) {
      const history = allRecords
        .filter(r => r.absent_students?.includes(studentId))
        .map(r => ({ date: r.date, section: r.section, group: r.group }));
      return new Response(JSON.stringify({ success: true,  history }), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'section-stats') {
      const stats = {};
      allRecords.forEach(r => {
        const sec = r.section_id || 'غير محدد';
        if (!stats[sec]) stats[sec] = { total: 0, absent: 0, days: 0 };
        stats[sec].total += r.total_students || 0;
        stats[sec].absent += r.absent_count || 0;
        stats[sec].days += 1;
      });
      return new Response(JSON.stringify({ success: true,  stats }), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'daily-trend') {
      const trend = {};
      allRecords.forEach(r => {
        if (!trend[r.date]) trend[r.date] = { absent: 0, total: 0 };
        trend[r.date].absent += r.absent_count || 0;
        trend[r.date].total += r.total_students || 0;
      });
      const sorted = Object.entries(trend).sort(([a], [b]) => a.localeCompare(b));
      return new Response(JSON.stringify({ success: true,  sorted }), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 🔹 الإحصائيات العامة
    const summary = {
      totalRecords: allRecords.length,
      totalStudents: allRecords.reduce((sum, r) => sum + (r.total_students || 0), 0),
      totalAbsent: allRecords.reduce((sum, r) => sum + (r.absent_count || 0), 0),
      avgAbsentRate: 0,
      topAbsentSections: [],
      dailyData: [],
      sectionData: []
    };

    summary.avgAbsentRate = summary.totalStudents > 0 
      ? ((summary.totalAbsent / summary.totalStudents) * 100).toFixed(1) 
      : 0;

    // تجميع البيانات اليومية للرسم البياني
    const dailyMap = {};
    allRecords.forEach(r => {
      if (!dailyMap[r.date]) dailyMap[r.date] = { date: r.date, absent: 0, total: 0 };
      dailyMap[r.date].absent += r.absent_count || 0;
      dailyMap[r.date].total += r.total_students || 0;
    });
    summary.dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // تجميع البيانات حسب الشعبة
    const sectionMap = {};
    allRecords.forEach(r => {
      const sec = r.section_id || 'غير محدد';
      if (!sectionMap[sec]) sectionMap[sec] = { section: sec, absent: 0, total: 0 };
      sectionMap[sec].absent += r.absent_count || 0;
      sectionMap[sec].total += r.total_students || 0;
    });
    summary.sectionData = Object.values(sectionMap)
      .map(s => ({ ...s, rate: s.total > 0 ? ((s.absent/s.total)*100).toFixed(1) : 0 }))
      .sort((a, b) => b.absent - a.absent);

    summary.topAbsentSections = summary.sectionData.slice(0, 5);

    return new Response(JSON.stringify({ success: true,  summary }), { 
      status: 200, headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Reports API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
