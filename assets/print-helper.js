// أدوات مساعدة للطباعة والمشاركة
const PrintHelper = {
    // تحسين التنسيق قبل الطباعة
    beforePrint: function() {
        document.querySelectorAll('.chart-box canvas').forEach(canvas => {
            canvas.style.width = '100%';
            canvas.style.height = '300px';
        });
    },
    
    // استعادة التنسيق بعد الطباعة
    afterPrint: function() {
        // إعادة ضبط الأحجام إذا لزم
    },
    
    // توليد تقرير مختصر للمشاركة
    generateSummary: function() {
        return {
            date: new Date().toLocaleDateString('ar-OM'),
            totalDays: document.getElementById('statDays')?.textContent || 0,
            totalAbsent: document.getElementById('statAbsent')?.textContent || 0,
            avgRate: document.getElementById('statRate')?.textContent || '0%'
        };
    }
};

// ربط أحداث الطباعة
window.addEventListener('beforeprint', () => PrintHelper.beforePrint());
window.addEventListener('afterprint', () => PrintHelper.afterPrint());
