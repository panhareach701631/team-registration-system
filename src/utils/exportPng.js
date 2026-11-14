import { formatDate, calculateEventStats } from './formatting';

/**
 * High-Resolution Native Canvas PNG Report Generator
 *
 * Generates crisp 2x retina PNG images of the complete Team Registration Report
 * using Canvas 2D with the Navy (#101C32) and Blue (#2563EB) sports management palette.
 * Embeds the official "ក្រុមខ្មែរតែមួយ - Khmer Team One" logo.
 */
export async function exportEventAsPng(
  event,
  teams = [],
  registrations = [],
  filename = 'team-registration-report'
) {
  if (!event) throw new Error('Event data is required for PNG export');

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed even if FontFaceSet check fails
    }
  }

  const stats = calculateEventStats(registrations);
  const teamMap = {};
  ['A', 'B', 'C'].forEach((letter) => {
    teamMap[letter] = teams.find((item) => item.team_letter === letter) || {
      team_letter: letter,
      team_name: `Team ${letter}`,
      captain_name: 'Unassigned',
      team_color: letter === 'A' ? '#2563EB' : letter === 'B' ? '#DC2626' : '#16A34A',
    };
  });

  // Try loading official club logo
  let logoImg = null;
  try {
    logoImg = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/logo.jpg';
    });
  } catch {
    logoImg = null;
  }

  const scale = 2;
  const width = 1000;

  let estimatedHeight = 350;
  ['A', 'B', 'C'].forEach((letter) => {
    const count = registrations.filter((r) => r.team_letter === letter).length;
    estimatedHeight += 70;
    estimatedHeight += Math.max(count, 1) * 36;
    estimatedHeight += 25;
  });
  estimatedHeight += 110;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = estimatedHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background: Light Gray #F8FAFC
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, estimatedHeight);

  // Main Card Wrapper: White #FFFFFF with Slate 200 border
  const pad = 24;
  const cardWidth = width - pad * 2;
  const cardHeight = estimatedHeight - pad * 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(pad, pad, cardWidth, cardHeight, 16);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  let y = pad + 28;

  // --- 1. HEADER SECTION WITH LOGO ---
  let textStartX = pad + 24;

  if (logoImg) {
    const logoSize = 64;
    const logoX = pad + 24;
    const logoY = y - 6;

    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    textStartX = logoX + logoSize + 16;
  }

  // Brand Name & Sub-badge: Accent Blue #2563EB
  ctx.fillStyle = '#2563EB';
  ctx.font = 'bold 11px "Kantumruy Pro", Inter, system-ui, sans-serif';
  ctx.fillText('ក្រុមខ្មែរតែមួយ • KHMER TEAM ONE • OFFICIAL REPORT', textStartX, y + 2);

  // Status Badge
  const statusIsOpen = event.status === 'OPEN';
  const badgeText = event.status || 'OPEN';
  const badgeWidth = 74;
  ctx.fillStyle = statusIsOpen ? '#ECFDF5' : '#FEF2F2';
  ctx.beginPath();
  ctx.roundRect(pad + cardWidth - 98, y - 10, badgeWidth, 22, 11);
  ctx.fill();
  ctx.strokeStyle = statusIsOpen ? '#A7F3D0' : '#FECACA';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = statusIsOpen ? '#16A34A' : '#DC2626';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, pad + cardWidth - 98 + badgeWidth / 2, y + 4);
  ctx.textAlign = 'left';

  y += 24;

  // Event Topic: Navy #101C32
  ctx.fillStyle = '#101C32';
  ctx.font = 'bold 20px "Kantumruy Pro", Inter, system-ui, sans-serif';
  ctx.fillText(event.topic || 'Untitled Event', textStartX, y);

  y += 20;

  // Time & Location
  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Kantumruy Pro", Inter, system-ui, sans-serif';
  const timeLocText = `ពេលវេលា (Time): ${event.event_time || 'N/A'}     |     ទីកន្លែង (Location): ${event.location || 'N/A'}`;
  ctx.fillText(timeLocText, textStartX, y);

  y += 28;

  // Divider
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad + 24, y);
  ctx.lineTo(pad + cardWidth - 24, y);
  ctx.stroke();

  y += 18;

  // --- 2. SUMMARY METRICS BAR ---
  const statBoxWidth = (cardWidth - 48 - 36) / 4;
  const statHeight = 58;
  const statItems = [
    { label: 'កីឡាករសរុប (TOTAL PLAYERS)', value: String(stats.totalPlayers), desc: 'Registered Roster', highlight: true },
    { label: 'កីឡាករក្រុម A', value: String(stats.teamAPlayers), desc: `${teamMap['A'].team_name}`, highlight: false },
    { label: 'កីឡាករក្រុម B', value: String(stats.teamBPlayers), desc: `${teamMap['B'].team_name}`, highlight: false },
    { label: 'កីឡាករក្រុម C', value: String(stats.teamCPlayers), desc: `${teamMap['C'].team_name}`, highlight: false },
  ];

  statItems.forEach((st, idx) => {
    const sx = pad + 24 + idx * (statBoxWidth + 12);
    ctx.fillStyle = st.highlight ? '#101C32' : '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(sx, y, statBoxWidth, statHeight, 10);
    ctx.fill();
    ctx.strokeStyle = st.highlight ? '#1E293B' : '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = st.highlight ? '#93C5FD' : '#64748B';
    ctx.font = 'bold 9px "Kantumruy Pro", Inter, sans-serif';
    ctx.fillText(st.label, sx + 12, y + 16);

    ctx.fillStyle = st.highlight ? '#FFFFFF' : '#101C32';
    ctx.font = 'bold 18px Inter, monospace, sans-serif';
    ctx.fillText(st.value, sx + 12, y + 36);

    ctx.fillStyle = st.highlight ? '#CBD5E1' : '#64748B';
    ctx.font = '9px "Kantumruy Pro", Inter, sans-serif';
    ctx.fillText(st.desc, sx + 12, y + 50);
  });

  y += statHeight + 24;

  // --- 3. TEAM TABLES (TEAMS A, B, C) ---
  ['A', 'B', 'C'].forEach((letter) => {
    const team = teamMap[letter];
    const teamRegs = registrations
      .filter((r) => r.team_letter === letter)
      .sort((a, b) => a.name.localeCompare(b.name));

    const tableX = pad + 24;
    const tableW = cardWidth - 48;

    // Team Header Banner
    ctx.fillStyle = team.team_color || '#2563EB';
    ctx.beginPath();
    ctx.roundRect(tableX, y, tableW, 38, [8, 8, 0, 0]);
    ctx.fill();

    // Team Letter Badge
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.roundRect(tableX + 10, y + 6, 26, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(letter, tableX + 23, y + 23);
    ctx.textAlign = 'left';

    // Team Name & Captain
    ctx.font = 'bold 13px "Kantumruy Pro", Inter, sans-serif';
    ctx.fillText(`${team.team_name} (Team ${letter})`, tableX + 46, y + 23);

    ctx.font = '11px "Kantumruy Pro", Inter, sans-serif';
    ctx.fillText(`Captain: ${team.captain_name || 'N/A'}`, tableX + 260, y + 23);

    // Team Total Players Count on right
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Kantumruy Pro", Inter, sans-serif';
    ctx.fillText(`កីឡាករ: ${teamRegs.length} នាក់`, tableX + tableW - 16, y + 23);
    ctx.textAlign = 'left';

    y += 38;

    // Table Header Row
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(tableX, y, tableW, 26);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(tableX, y, tableW, 26);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 10px "Kantumruy Pro", Inter, sans-serif';
    ctx.fillText('ល.រ (NO.)', tableX + 14, y + 17);
    ctx.fillText('ឈ្មោះកីឡាករ (PLAYER NAME)', tableX + 80, y + 17);
    ctx.fillText('លេខកីឡាករ (NUMBER)', tableX + 420, y + 17);
    ctx.textAlign = 'right';
    ctx.fillText('កាលបរិច្ឆេទ (DATE)', tableX + tableW - 16, y + 17);
    ctx.textAlign = 'left';

    y += 26;

    if (teamRegs.length === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(tableX, y, tableW, 32);
      ctx.strokeStyle = '#E2E8F0';
      ctx.strokeRect(tableX, y, tableW, 32);

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'italic 11px "Kantumruy Pro", Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'មិនទាន់មានកីឡាករចុះឈ្មោះក្នុងក្រុមនេះទេ (No players registered yet)',
        tableX + tableW / 2,
        y + 20
      );
      ctx.textAlign = 'left';
      y += 32;
    } else {
      teamRegs.forEach((reg, rIdx) => {
        const rowH = 34;
        ctx.fillStyle = rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        ctx.fillRect(tableX, y, tableW, rowH);
        ctx.strokeStyle = '#E2E8F0';
        ctx.strokeRect(tableX, y, tableW, rowH);

        ctx.fillStyle = '#64748B';
        ctx.font = '11px Inter, monospace, sans-serif';
        ctx.fillText(String(rIdx + 1), tableX + 14, y + 21);

        ctx.fillStyle = '#101C32';
        ctx.font = 'bold 11px "Kantumruy Pro", Inter, sans-serif';
        ctx.fillText(reg.name, tableX + 80, y + 21);

        const pNo = reg.player_no || reg.number_of_players || '—';
        ctx.fillStyle = '#EFF6FF';
        ctx.beginPath();
        ctx.roundRect(tableX + 420, y + 7, 52, 20, 6);
        ctx.fill();
        ctx.strokeStyle = '#BFDBFE';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#2563EB';
        ctx.font = 'bold 11px Inter, monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`#${pNo}`, tableX + 446, y + 21);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#64748B';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(formatDate(reg.created_at), tableX + tableW - 16, y + 21);
        ctx.textAlign = 'left';

        y += rowH;
      });
    }

    // Team Footer Total Row
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(tableX, y, tableW, 28, [0, 0, 8, 8]);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(tableX, y, tableW, 28);

    ctx.fillStyle = '#101C32';
    ctx.font = 'bold 11px "Kantumruy Pro", Inter, sans-serif';
    ctx.fillText(`សរុបក្រុម ${letter} (Team ${letter} Total):`, tableX + 14, y + 18);

    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 11px Inter, monospace, sans-serif';
    ctx.fillText(`${teamRegs.length} Players`, tableX + 220, y + 18);

    y += 44;
  });

  // --- 4. GRAND TOTAL FOOTER BLOCK ---
  const footX = pad + 24;
  const footW = cardWidth - 48;
  ctx.fillStyle = '#101C32';
  ctx.beginPath();
  ctx.roundRect(footX, y, footW, 46, 10);
  ctx.fill();
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px "Kantumruy Pro", Inter, sans-serif';
  ctx.fillText(
    'ក្រុមខ្មែរតែមួយ • សេចក្ដីសង្ខេបព្រឹត្តិការណ៍រួម (KHMER TEAM ONE)',
    footX + 18,
    y + 28
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#93C5FD';
  ctx.font = 'bold 14px Inter, monospace, sans-serif';
  ctx.fillText(`TOTAL PLAYERS: ${stats.totalPlayers}`, footX + footW - 18, y + 28);
  ctx.textAlign = 'left';

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportElementAsPng(
  target,
  filename = 'team-registration-report',
  fallbackData = null
) {
  if (fallbackData && fallbackData.event) {
    return exportEventAsPng(
      fallbackData.event,
      fallbackData.teams || [],
      fallbackData.registrations || [],
      filename
    );
  }
  throw new Error('Please provide event data for PNG export');
}
