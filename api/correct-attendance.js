import { Octokit } from "@octokit/rest";

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const { date, group, section, studentId, newStatus } = await req.json();
  const repo = process.env.GITHUB_REPO;
  const owner = process.env.GITHUB_OWNER;
  
  const fileName = `attendance_logs/attendance_${date}_${group}.json`;

  try {
    // جلب ملف الحضور الحالي
    const { data } = await octokit.repos.getContent({ 
      owner, 
      repo, 
      path: fileName 
    });
    
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const record = JSON.parse(content);

    // تحديث حالة الطالب
    const absentIds = record.absentIds || [];
    const absentNames = record.absentNames || [];
    
    if (newStatus === 'present') {
      // تحويل من غائب إلى حاضر
      const idx = absentIds.indexOf(studentId);
      if (idx !== -1) {
        absentIds.splice(idx, 1);
        // إزالة الاسم من قائمة الغائبين
        const studentIndex = record.students?.findIndex(s => s.id === studentId);
        if (studentIndex !== -1 && absentNames[studentIndex]) {
          absentNames.splice(idx, 1);
        }
      }
      record.present = (record.present || 0) + 1;
      record.absent = (record.absent || 0) - 1;
    } else {
      // تحويل من حاضر إلى غائب
      if (!absentIds.includes(studentId)) {
        absentIds.push(studentId);
        const student = record.students?.find(s => s.id === studentId);
        if (student) {
          absentNames.push(student.name);
        }
      }
      record.present = (record.present || 0) - 1;
      record.absent = (record.absent || 0) + 1;
    }

    record.absentIds = absentIds;
    record.absentNames = absentNames;

    // حفظ الملف المحدث
    await octokit.repos.createOrUpdateFileContents({
      owner, 
      repo, 
      path: fileName,
      message: `Correct attendance: ${studentId} - ${newStatus} - ${new Date().toISOString()}`,
      content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64'),
      sha: data.sha
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
