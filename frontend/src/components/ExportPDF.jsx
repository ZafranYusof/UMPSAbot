import { useCallback } from 'react';
import { Download } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

function ExportPDF({ messages }) {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const handleExport = useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('UMPSABot Chat Export', margin, y);
    y += 8;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Exported: ${new Date().toLocaleString('en-MY')}`, margin, y);
    y += 12;

    // Separator
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Messages
    doc.setTextColor(0);
    messages.forEach((msg) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const role = msg.role === 'user' ? 'You' : 'UMPSABot';
      const time = new Date(msg.timestamp).toLocaleTimeString('en-MY', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Role + time
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(msg.role === 'user' ? 0 : 0, msg.role === 'user' ? 100 : 150, msg.role === 'user' ? 150 : 200);
      doc.text(`${role} · ${time}`, margin, y);
      y += 5;

      // Content
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30);
      const lines = doc.splitTextToSize(msg.content, maxWidth);
      lines.forEach((line) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 5;
      });

      y += 8;
    });

    doc.save(`UMPSABot-chat-${Date.now()}.pdf`);
  }, [messages]);

  if (!messages || messages.length === 0) return null;

  return (
    <button
      onClick={handleExport}
      className={`p-2 rounded-lg transition-colors ${
        isDark
          ? 'hover:bg-navy-700 text-gray-400 hover:text-accent'
          : 'hover:bg-gray-100 text-gray-500 hover:text-accent'
      }`}
      aria-label={t.exportPdf}
      title={t.exportPdf}
    >
      <Download size={18} />
    </button>
  );
}

export default ExportPDF;
