import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, calculateEventStats } from './formatting';

/**
 * Converts a hex color string to RGB array [r, g, b]
 */
function hexToRgb(hex) {
  let c = (hex || '#2563EB').replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  if (Number.isNaN(num)) return [37, 99, 235];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Generates and downloads a clean, professional Navy & Blue Sports Management PDF report for an event
 */
export function exportEventPdf(event, teams, registrations) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const stats = calculateEventStats(registrations);
  const teamMap = {};
  teams.forEach((team) => {
    teamMap[team.team_letter] = team;
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 16;

  // --- HEADER SECTION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(16, 28, 50); // Navy #101C32
  doc.text('KHMER TEAM ONE - TEAM REGISTRATION REPORT', margin, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  const generatedText = `Generated on ${formatDate(new Date().toISOString())} | Event Token: ${event.registration_token || 'N/A'}`;
  doc.text(generatedText, margin, currentY);

  currentY += 6;
  // Sports Accent Line #2563EB
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 8;

  // --- EVENT DETAILS CARD ---
  // Light Gray #F8FAFC, Slate 200 Border
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 28, 50);
  doc.text(`Topic: ${event.topic || 'Untitled Event'}`, margin + 4, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Time: ${event.event_time || 'N/A'}`, margin + 4, currentY + 14);
  doc.text(`Location: ${event.location || 'N/A'}`, margin + 4, currentY + 20);

  // Status tag on right side of card
  const statusX = pageWidth - margin - 34;
  const statusColor = event.status === 'OPEN' ? [22, 163, 74] : [220, 38, 38]; // Green #16A34A or Red #DC2626
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`STATUS: ${event.status || 'OPEN'}`, statusX, currentY + 7);

  currentY += 30;

  // --- SUMMARY STATS BAR ---
  const summaryBoxWidth = (pageWidth - margin * 2 - 15) / 4;
  const statBoxes = [
    { label: 'Total Players', value: `${stats.totalPlayers} Players`, highlight: true },
    { label: 'Team A Players', value: `${stats.teamAPlayers} Players`, highlight: false },
    { label: 'Team B Players', value: `${stats.teamBPlayers} Players`, highlight: false },
    { label: 'Team C Players', value: `${stats.teamCPlayers} Players`, highlight: false },
  ];

  statBoxes.forEach((item, index) => {
    const x = margin + index * (summaryBoxWidth + 5);
    if (item.highlight) {
      doc.setFillColor(16, 28, 50); // Navy card
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.roundedRect(x, currentY, summaryBoxWidth, 16, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, summaryBoxWidth, 16, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(item.highlight ? 147 : 100, item.highlight ? 197 : 116, item.highlight ? 253 : 139);
    doc.text(item.label, x + 3, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    if (item.highlight) {
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(16, 28, 50);
    }
    doc.text(item.value, x + 3, currentY + 13);
  });

  currentY += 22;

  // --- 3 TEAM TABLES ---
  const teamLetters = ['A', 'B', 'C'];

  teamLetters.forEach((letter) => {
    const team = teamMap[letter] || {
      team_name: `Team ${letter}`,
      captain_name: 'Unassigned',
      team_color: letter === 'A' ? '#2563EB' : letter === 'B' ? '#DC2626' : '#16A34A',
    };

    const teamRegs = registrations
      .filter((r) => r.team_letter === letter)
      .sort((a, b) => a.name.localeCompare(b.name));

    const rgb = hexToRgb(team.team_color || '#2563EB');

    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(margin, currentY, 3.5, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(16, 28, 50);
    doc.text(`TEAM ${letter}: ${team.team_name || `Team ${letter}`}`, margin + 6, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const metaText = `Captain: ${team.captain_name || 'N/A'}  |  Total Players: ${teamRegs.length}`;
    doc.text(metaText, margin + 65, currentY + 6);

    currentY += 11;

    const tableBody = teamRegs.map((reg, idx) => [
      idx + 1,
      reg.name,
      `#${reg.player_no || reg.number_of_players || '—'}`,
      formatDate(reg.created_at),
    ]);

    if (tableBody.length === 0) {
      tableBody.push(['—', 'No players registered yet', '—', '—']);
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['No.', 'Player Name', 'Player Key Number', 'Registered At']],
      body: tableBody,
      foot: [['', 'Team Total', `${teamRegs.length} Players`, '']],
      headStyles: {
        fillColor: [rgb[0], rgb[1], rgb[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      footStyles: {
        fillColor: [239, 246, 255],
        textColor: [16, 28, 50],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 44, halign: 'right' },
      },
      didDrawPage: (data) => {
        currentY = data.cursor.y + 10;
      },
    });

    currentY = doc.lastAutoTable.finalY + 10;
  });

  // --- FOOTER & PAGE NUMBERS ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Khmer Team One - Sports Management Report - Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const cleanTopic = (event.topic || 'event')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  const filename = `Report_${cleanTopic}_${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
}
