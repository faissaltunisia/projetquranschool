<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقارير الغياب - مدرسة القرآن الكريم</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root { --primary: #2c3e50; --secondary: #27ae60; --accent: #e67e22; --light: #ecf0f1; --danger: #c0392b; }
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg, #667eea, #764ba2); margin: 0; padding: 20px; min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 20px; padding: 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
        header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid var(--light); }
        header h1 { color: var(--primary); margin: 0; }
        header p { color: #666; margin: 5px 0 0; }
        
        .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px; padding: 20px; background: var(--light); border-radius: 15px; }
        .filters select, .filters input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 10px; font-size: 14px; }
        .filters button { background: var(--primary); color: white; padding: 12px; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; }
        .filters button:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; }
        .stat-card { background: linear-gradient(135deg, var(--primary), #34495e); color: white; padding: 20px; border-radius: 15px; text-align: center; }
        .stat-card.green { background: linear-gradient(135deg, var(--secondary), #2ecc71); }
        .stat-card.orange { background: linear-gradient(135deg, var(--accent), #f39c12); }
        .stat-number { font-size: 2em; font-weight: bold; margin: 5px 0; }
        .stat-label { font-size: 0.9em; opacity: 0.9; }
        
        .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 25px; }
        .chart-box { background: white; padding: 20px; border-radius: 15px; border: 2px solid var(--light); }
        .chart-box h3 { margin: 0 0 15px; color: var(--primary); font-size: 1.1em; }
        .chart-container { position: relative; height: 250px; }
        
        .student-search { background: #f8f9fa; padding: 20px; border-radius: 15px; margin-bottom: 25px; }
        .search-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .search-row input, .search-row select { flex: 1; min-width: 150px; padding: 12px; border: 2px solid #ddd; border-radius: 10px; }
        .search-row button { background: var(--secondary); color: white; padding: 12px 25px; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; }
        
        .student-result { display: none; margin-top: 20px; padding: 20px; background: white; border-radius: 15px; border: 2px solid var(--secondary); }
        .student-result.show { display: block; animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .student-header { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--light); }
        .student-avatar { width: 60px; height: 60px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5em; font-weight: bold; }
        .student-info h3 { margin: 0; color: var(--primary); }
        .student-info p { margin: 5px 0 0; color: #666; }
        .absence-list { list-style: none; padding: 0; margin: 0; }
        .absence-list li { padding: 10px 15px; margin: 5px 0; background: #fff5f5; border-right: 4px solid var(--danger); border-radius: 8px; display: flex; justify-content: space-between; }
        .absence-list li .date { font-weight: 600; color: var(--primary); }
        .absence-list li .section { color: #666; font-size: 0.9em; }
        
        .actions { display: flex; gap: 10px; margin-bottom: 25px; flex-wrap: wrap; }
        .btn-action { padding: 12px 20px; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .btn-print { background: var(--primary); color: white; }
        .btn-share { background: var(--accent); color: white; }
        .btn-csv { background: var(--secondary); color: white; }
        
        .table-responsive { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px 15px; text-align: right; border-bottom: 1px solid var(--light); }
        th { background: var(--light); color: var(--primary); font-weight: 600; }
        tr:hover { background: #f9f9f9; }
        
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; max-width: 100%; }
            .filters, .actions, .student-search { display: none !important; }
            .chart-box { break-inside: avoid; }
        }
        @media (max-width: 768px) {
            .charts-grid { grid-template-columns: 1fr; }
            .filters { grid-template-columns: 1fr 1fr; }
        }
    </style>
</head>
<body>
<div class="container" id="printArea">
    <header>
        <h1>📊 تقارير وإحصائيات الغياب</h1>
        <p>مدرسة القرآن الكريم - محافظة ظفار - سلطنة عُمان</p>
    </header>

    <div class="filters">
        <select id="filterGroup">
            <option value="">كل المجموعات</option>
            <option value="أ">المجموعة الأولى (أ)</option>
            <option value="ب">المجموعة الثانية (ب)</option>
        </select>
        <select id="filterSection">
            <option value="">جاري تحميل الشعب...</option>
        </select>
        <select id="filterPeriod">
            <option value="week">آخر 7 أيام</option>
            <option value="month">آخر 30 يوم</option>
            <option value="custom">فترة مخصصة</option>
        </select>
        <input type="date" id="filterStart" style="display:none;">
        <input type="date" id="filterEnd" style="display:none;">
        <button id="loadBtn" onclick="loadReports()">🔄 تحديث البيانات</button>
    </div>

    <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">إجمالي الأيام</div><div class="stat-number" id="statDays">0</div></div>
        <div class="stat-card green"><div class="stat-label">إجمالي الطلاب</div><div class="stat-number" id="statStudents">0</div></div>
        <div class="stat-card orange"><div class="stat-label">إجمالي الغياب</div><div class="stat-number" id="statAbsent">0</div></div>
        <div class="stat-card"><div class="stat-label">متوسط نسبة الغياب</div><div class="stat-number" id="statRate">0%</div></div>
    </div>

    <div class="charts-grid">
        <div class="chart-box">
            <h3>📈 اتجاه الغياب اليومي</h3>
            <div class="chart-container"><canvas id="trendChart"></canvas></div>
        </div>
        <div class="chart-box">
            <h3>🥧 مقارنة الشعب</h3>
            <div class="chart-container"><canvas id="sectionChart"></canvas></div>
        </div>
    </div>

    <div class="student-search">
        <h3 style="margin:0 0 15px">🔍 البحث عن غياب طالب</h3>
        <div class="search-row">
            <select id="searchGroup">
                <option value="">اختر المجموعة</option>
                <option value="أ">المجموعة الأولى (أ)</option>
                <option value="ب">المجموعة الثانية (ب)</option>
            </select>
            <select id="searchSection">
                <option value="">اختر الشعبة</option>
            </select>
            <input type="text" id="searchStudent" placeholder="أدخل اسم الطالب أو رقمه">
            <button onclick="searchStudent()">🔎 بحث</button>
        </div>
        <div id="studentResult" class="student-result">
            <div class="student-header">
                <div class="student-avatar" id="resultAvatar">ط</div>
                <div class="student-info">
                    <h3 id="resultName">اسم الطالب</h3>
                    <p id="resultDetails">المجموعة: - | الشعبة: -</p>
                </div>
            </div>
            <h4 style="margin:15px 0 10px">📅 أيام الغياب:</h4>
            <ul class="absence-list" id="absenceList"></ul>
            <p id="noAbsence" style="display:none; color: var(--secondary); font-weight: 600; text-align:center;">✅ لا يوجد غياب مسجل لهذا الطالب</p>
        </div>
    </div>

    <div class="actions">
        <button class="btn-action btn-print" onclick="printReport()">🖨️ طباعة التقرير</button>
        <button class="btn-action btn-share" onclick="shareReport()">🔗 مشاركة الرابط</button>
        <button class="btn-action btn-csv" onclick="exportCSV()">📥 تصدير CSV</button>
    </div>

    <div class="table-responsive">
        <table>
            <thead>
                <tr><th>التاريخ</th><th>المجموعة</th><th>الشعبة</th><th>إجمالي الطلاب</th><th>الغائبون</th><th>نسبة الغياب</th></tr>
            </thead>
            <tbody id="reportTable"></tbody>
        </table>
    </div>
</div>

<script>
// === متغيرات عامة ===
let trendChart, sectionChart;
let allSections = [];

// === دالة تنظيف البيانات (تزيل المسافات الزائدة من المفاتيح والقيم) ===
function cleanData(obj) {
    if (typeof obj === 'string') return obj.trim();
    if (Array.isArray(obj)) return obj.map(cleanData);
    if (obj && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k.trim(), cleanData(v)])
        );
    }
    return obj;
}

// === تهيئة الصفحة ===
document.addEventListener('DOMContentLoaded', () => {
    loadSections();
    document.getElementById('filterPeriod').addEventListener('change', (e) => {
        const custom = e.target.value === 'custom';
        document.getElementById('filterStart').style.display = custom ? 'block' : 'none';
        document.getElementById('filterEnd').style.display = custom ? 'block' : 'none';
    });
});

// === جلب قائمة الشعب ===
async function loadSections() {
    try {
        const [resA, resB] = await Promise.all([
            fetch('/api/get-section?group=أ'),
            fetch('/api/get-section?group=ب')
        ]);
        if (!resA.ok || !resB.ok) throw new Error('فشل الاتصال بالخادم');

        let dataA = cleanData(await resA.json());
        let dataB = cleanData(await resB.json());

        // توحيد الهيكل (يدعم المصفوفات والكائنات المفردة)
        const secA = dataA.sections ? dataA.sections : [dataA];
        const secB = dataB.sections ? dataB.sections : [dataB];

        secA.forEach(s => s.group = 'أ');
        secB.forEach(s => s.group = 'ب');
        allSections = [...secA, ...secB];

        ['filterSection', 'searchSection'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">كل الشعب</option>';
            allSections.forEach(sec => {
                if (!sec.section_id) return;
                const opt = document.createElement('option');
                opt.value = sec.section_id;
                opt.textContent = `${sec.section_label || sec.section_id} (${sec.group})`;
                sel.appendChild(opt);
            });
        });
    } catch(e) {
        console.error('خطأ تحميل الشعب:', e);
        document.querySelectorAll('#filterSection, #searchSection').forEach(s => s.innerHTML = '<option value="">فشل التحميل</option>');
    }
}

// === تحميل التقارير ===
async function loadReports() {
    const btn = document.getElementById('loadBtn');
    btn.disabled = true; btn.textContent = 'جاري التحميل...';

    const group = document.getElementById('filterGroup').value;
    const section = document.getElementById('filterSection').value;
    const period = document.getElementById('filterPeriod').value;
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    
    let url = `/api/get-reports?action=summary`;
    if(group) url += `&group=${group}`;
    if(section) url += `&section=${section}`;
    if(period) url += `&period=${period}`;
    if(start) url += `&startDate=${start}`;
    if(end) url += `&endDate=${end}`;
    
    try {
        const res = await fetch(url);
        const { success,  summary } = await res.json();
        if(!success) throw new Error(data.error);
        
        document.getElementById('statDays').textContent = summary.totalRecords;
        document.getElementById('statStudents').textContent = summary.totalStudents;
        document.getElementById('statAbsent').textContent = summary.totalAbsent;
        document.getElementById('statRate').textContent = summary.avgAbsentRate + '%';
        
        renderTrendChart(summary.dailyData || []);
        renderSectionChart(summary.sectionData || []);
        renderTable(summary.dailyData || []);
    } catch(e) {
        console.error('خطأ التقارير:', e);
        alert('تعذر جلب الإحصائيات: ' + e.message);
    } finally {
        btn.disabled = false; btn.textContent = '🔄 تحديث البيانات';
    }
}

// === رسم المخططات ===
function renderTrendChart(dailyData) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    if(trendChart) trendChart.destroy();
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyData.map(d => d.date?.slice(5) || ''),
            datasets: [{
                label: 'عدد الغائبين',
                data: dailyData.map(d => d.absent || 0),
                borderColor: '#c0392b',
                backgroundColor: 'rgba(192,57,43,0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderSectionChart(sectionData) {
    const ctx = document.getElementById('sectionChart').getContext('2d');
    if(sectionChart) sectionChart.destroy();
    
    const top5 = sectionData.slice(0, 5);
    sectionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: top5.map(s => s.section || 'غير محدد'),
            datasets: [{
                data: top5.map(s => s.absent || 0),
                backgroundColor: ['#2c3e50', '#27ae60', '#e67e22', '#8e44ad', '#16a085'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

// === جدول التفاصيل ===
function renderTable(dailyData) {
    const tbody = document.getElementById('reportTable');
    tbody.innerHTML = '';
    dailyData.forEach(row => {
        const rate = row.total > 0 ? ((row.absent/row.total)*100).toFixed(1) : 0;
        tbody.innerHTML += `<tr><td>${row.date}</td><td>-</td><td>جميع الشعب</td><td>${row.total}</td><td>${row.absent}</td><td>${rate}%</td></tr>`;
    });
}

// === البحث عن طالب ===
async function searchStudent() {
    const group = document.getElementById('searchGroup').value;
    const sectionId = document.getElementById('searchSection').value;
    const query = document.getElementById('searchStudent').value.trim();
    const resultDiv = document.getElementById('studentResult');
    
    if (!group || !query) return alert('يرجى اختيار المجموعة وإدخال اسم الطالب أو رقمه');
    if (allSections.length === 0) return alert('يرجى الانتظار حتى يتم تحميل بيانات الشعب...');

    resultDiv.classList.remove('show');
    
    try {
        let targetSection = allSections.find(s => s.group === group && (!sectionId || s.section_id === sectionId));
        if (!targetSection) throw new Error('الشعبة المختارة غير موجودة في البيانات');
        
        const student = targetSection.students?.find(s => 
            (s.name || '').includes(query) || (s.id || '').includes(query)
        );
        if (!student) return alert(`لم يتم العثور على "${query}" في الشعبة المختارة`);
        
        const historyRes = await fetch(`/api/get-reports?action=student-history&studentId=${encodeURIComponent(student.id)}`);
        const { success,  history } = await historyRes.json();
        if(!success) throw new Error(data.error);
        
        document.getElementById('resultAvatar').textContent = (student.name || 'ط').charAt(0);
        document.getElementById('resultName').textContent = student.name;
        document.getElementById('resultDetails').textContent = `المجموعة: ${group} | الشعبة: ${targetSection.section_label || targetSection.section_id}`;
        
        const list = document.getElementById('absenceList');
        const noAbsence = document.getElementById('noAbsence');
        list.innerHTML = '';
        
        if (!history || history.length === 0) {
            noAbsence.style.display = 'block';
        } else {
            noAbsence.style.display = 'none';
            history.forEach(h => {
                list.innerHTML += `<li><span class="date">${h.date}</span><span class="section">${h.section || '-'}</span></li>`;
            });
        }
        resultDiv.classList.add('show');
    } catch(e) {
        alert('خطأ في البحث: ' + e.message);
    }
}

// === أدوات التصدير والطباعة ===
function printReport() { window.print(); }

async function shareReport() {
    try { await navigator.share({ title: 'تقرير الغياب', url: window.location.href }); } 
    catch { await navigator.clipboard.writeText(window.location.href); alert('✅ تم نسخ الرابط'); }
}

function exportCSV() {
    const rows = [['التاريخ', 'المجموعة', 'الشعبة', 'إجمالي الطلاب', 'الغائبون', 'نسبة الغياب']];
    document.querySelectorAll('#reportTable tr').forEach(tr => {
        rows.push(Array.from(tr.querySelectorAll('td')).map(td => td.textContent));
    });
    const csv = '\ufeff' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `تقرير_الغياب_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}
</script>
</body>
</html>
