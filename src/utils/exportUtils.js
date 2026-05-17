import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Changed this line

export const exportToPDF = (blocks, userName) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`Exam Study Schedule - ${userName}`, 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);

  const tableData = blocks.map(block => [
    new Date(block.date).toLocaleDateString(),
    block.subject,
    block.startTime,
    block.endTime,
    block.completed? 'Done' : 'Pending'
  ]);

  autoTable(doc, {
    head: [['Date', 'Subject', 'Start', 'End', 'Status']],
    body: tableData,
    startY: 35, // moved down to fit the date line
  });

  doc.save(`${userName}-study-schedule.pdf`);
};

export const exportToICS = (blocks) => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ExamPlanner//EN'
  ];

  blocks.forEach(block => {
    const date = new Date(block.date).toISOString().split('T')[0].replace(/-/g, '');
    const start = block.startTime.replace(':', '') + '00';
    const end = block.endTime.replace(':', '') + '00';

    icsContent.push(
      'BEGIN:VEVENT',
      `DTSTART:${date}T${start}`,
      `DTEND:${date}T${end}`,
      `SUMMARY:${block.subject} Study`,
      `DESCRIPTION:Study block for ${block.subject}`,
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'study-schedule.ics';
  link.click();
  URL.revokeObjectURL(url);
};