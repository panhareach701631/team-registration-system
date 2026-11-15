import { formatDate } from './formatting.js';

/**
 * Standard IEEE 802.3 CRC-32 lookup table for valid OOXML (.xlsx) ZIP entries.
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const modTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
  const modDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
  return { modTime, modDate };
}

/**
 * Builds an uncompressed (STORE) ZIP archive from { name, data } UTF-8 text/byte entries.
 * Produces a valid OOXML .xlsx package readable by Excel, Google Sheets, and LibreOffice.
 */
function buildZipBytes(files) {
  const encoder = new TextEncoder();
  const localChunks = [];
  const centralChunks = [];
  const { modTime, modDate } = getDosDateTime(new Date());
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    const checksum = crc32(dataBytes);
    const size = dataBytes.length;
    const hasNonAsciiName = /[^\x20-\x7e]/.test(file.name);
    const flags = hasNonAsciiName ? 0x0800 : 0x0000;

    // Local File Header (30 bytes)
    const localHeader = new ArrayBuffer(30);
    const lv = new DataView(localHeader);
    lv.setUint32(0, 0x04034b50, true); // Local header signature
    lv.setUint16(4, 20, true); // Version needed (2.0)
    lv.setUint16(6, flags, true);
    lv.setUint16(8, 0, true); // Compression: STORE
    lv.setUint16(10, modTime, true);
    lv.setUint16(12, modDate, true);
    lv.setUint32(14, checksum, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // Extra field length

    localChunks.push(new Uint8Array(localHeader), nameBytes, dataBytes);

    // Central Directory Header (46 bytes)
    const centralHeader = new ArrayBuffer(46);
    const cv = new DataView(centralHeader);
    cv.setUint32(0, 0x02014b50, true); // Central header signature
    cv.setUint16(4, 20, true); // Version made by
    cv.setUint16(6, 20, true); // Version needed
    cv.setUint16(8, flags, true);
    cv.setUint16(10, 0, true); // Compression: STORE
    cv.setUint16(12, modTime, true);
    cv.setUint16(14, modDate, true);
    cv.setUint32(16, checksum, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true); // Extra len
    cv.setUint16(32, 0, true); // Comment len
    cv.setUint16(34, 0, true); // Disk number start
    cv.setUint16(36, 0, true); // Internal attributes
    cv.setUint32(38, 0x20, true); // External attributes (archive)
    cv.setUint32(42, offset, true); // Relative offset of local header

    centralChunks.push(new Uint8Array(centralHeader), nameBytes);

    offset += 30 + nameBytes.length + size;
  });

  const centralDirOffset = offset;
  let centralDirSize = 0;
  centralChunks.forEach((chunk) => {
    centralDirSize += chunk.length;
  });

  // End of Central Directory Record (22 bytes)
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, centralDirOffset, true);
  ev.setUint16(20, 0, true);

  const totalSize = centralDirOffset + centralDirSize + 22;
  const output = new Uint8Array(totalSize);
  let pos = 0;

  localChunks.forEach((chunk) => {
    output.set(chunk, pos);
    pos += chunk.length;
  });
  centralChunks.forEach((chunk) => {
    output.set(chunk, pos);
    pos += chunk.length;
  });
  output.set(new Uint8Array(eocd), pos);

  return output;
}

function escapeXml(value) {
  // Strip invalid XML 1.0 control chars before entity escaping
  // eslint-disable-next-line no-control-regex
  const cleaned = String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colLetter(indexZeroBased) {
  let n = indexZeroBased;
  let str = '';
  while (n >= 0) {
    str = String.fromCharCode((n % 26) + 65) + str;
    n = Math.floor(n / 26) - 1;
  }
  return str;
}

function createSharedStrings() {
  const strings = [];
  const indexMap = new Map();
  let totalReferences = 0;

  return {
    add(value) {
      const text = String(value ?? '');
      totalReferences += 1;
      if (indexMap.has(text)) {
        return indexMap.get(text);
      }
      const idx = strings.length;
      strings.push(text);
      indexMap.set(text, idx);
      return idx;
    },
    toXml() {
      const items = strings
        .map((s) => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`)
        .join('');
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${totalReferences}" uniqueCount="${strings.length}">${items}</sst>`;
    },
  };
}

function numberCell(ref, styleIdx, num) {
  return `<c r="${ref}" s="${styleIdx}"><v>${Number(num)}</v></c>`;
}

function emptyStyledCell(ref, styleIdx) {
  return `<c r="${ref}" s="${styleIdx}"/>`;
}

/**
 * Generates styled OOXML (.xlsx) bytes for the Team Member Directory report.
 * Uses standard sharedStrings.xml + strict ECMA-376 SpreadsheetML structure for Excel/Sheets/Mobile compatibility.
 */
export function buildMembersXlsxBytes(members = [], options = {}) {
  const { lang = 'km', filterSummary = '' } = options;
  const isKm = lang === 'km';
  const generatedStr = formatDate(new Date().toISOString());
  const sharedStrings = createSharedStrings();

  const stringCell = (ref, styleIdx, text) => {
    const idx = sharedStrings.add(text);
    return `<c r="${ref}" s="${styleIdx}" t="s"><v>${idx}</v></c>`;
  };

  const totalCount = members.length;
  const tgJoinedCount = members.filter((m) => m.telegram_status === 'JOINED').length;
  const uniformReceivedCount = members.filter((m) => m.uniform_status === 'RECEIVED').length;
  const uniformPendingCount = totalCount - uniformReceivedCount;

  const titleText = isKm
    ? 'ក្រុមខ្មែរតែមួយ (KHMER TEAM ONE) - របាយការណ៍បញ្ជីឈ្មោះសមាជិកក្រុម'
    : 'KHMER TEAM ONE (ក្រុមខ្មែរតែមួយ) - TEAM MEMBER DIRECTORY REPORT';

  const summaryText = isKm
    ? `សរុបសមាជិក៖ ${totalCount} នាក់  |  Telegram ចូលរួច៖ ${tgJoinedCount}  |  បានទទួលឯកសណ្ឋាន៖ ${uniformReceivedCount}  |  មិនទាន់មាន៖ ${uniformPendingCount}${filterSummary ? `  |  តម្រង៖ ${filterSummary}` : ''}  |  កាលបរិច្ឆេទ៖ ${generatedStr}`
    : `Total Squad: ${totalCount}  |  Telegram Joined: ${tgJoinedCount}  |  Uniform Received: ${uniformReceivedCount}  |  Uniform Pending: ${uniformPendingCount}${filterSummary ? `  |  Filter: ${filterSummary}` : ''}  |  Generated: ${generatedStr}`;

  const headers = isKm
    ? [
        'ល.រ (No.)',
        'ឈ្មោះលើអាវ (Jersey Name)',
        'ឈ្មោះពេញ (Full Name)',
        'លេខអាវ (#)',
        'តួនាទី (Position)',
        'លេខទូរស័ព្ទ (Phone)',
        'Telegram',
        'ឯកសណ្ឋាន (Uniform)',
        'កំណត់សម្គាល់ (Notes)',
        'កាលបរិច្ឆេទ (Updated)',
      ]
    : [
        'No.',
        'Jersey Name',
        'Full Name',
        'Jersey #',
        'Position / Role',
        'Phone',
        'Telegram',
        'Uniform Status',
        'Notes',
        'Last Updated',
      ];

  const rowsXml = [];

  // Row 1: Title Banner (merged A1:J1, include placeholder styled cells for B1:J1)
  const titleTrailing = Array.from({ length: 9 }, (_, i) =>
    emptyStyledCell(`${colLetter(i + 1)}1`, 1)
  ).join('');
  rowsXml.push(
    `<row r="1" spans="1:10" customHeight="1" ht="34">${stringCell('A1', 1, titleText)}${titleTrailing}</row>`
  );

  // Row 2: Summary Stats Banner (merged A2:J2, include placeholder styled cells for B2:J2)
  const summaryTrailing = Array.from({ length: 9 }, (_, i) =>
    emptyStyledCell(`${colLetter(i + 1)}2`, 2)
  ).join('');
  rowsXml.push(
    `<row r="2" spans="1:10" customHeight="1" ht="26">${stringCell('A2', 2, summaryText)}${summaryTrailing}</row>`
  );

  // Row 3: Blank spacer
  rowsXml.push(`<row r="3" spans="1:10" customHeight="1" ht="10"/>`);

  // Row 4: Table Headers
  const headerCells = headers
    .map((h, idx) => stringCell(`${colLetter(idx)}4`, 3, h))
    .join('');
  rowsXml.push(`<row r="4" spans="1:10" customHeight="1" ht="30">${headerCells}</row>`);

  // Data Rows (starting at row 5)
  members.forEach((member, index) => {
    const r = index + 5;
    const baseStyle = index % 2 === 0 ? 4 : 5;
    const isJoined = member.telegram_status === 'JOINED';
    const isReceived = member.uniform_status === 'RECEIVED';

    const tgText = isJoined
      ? isKm
        ? 'បញ្ចូលរួច (Joined)'
        : 'Joined (បញ្ចូលរួច)'
      : isKm
        ? 'មិនទាន់បញ្ចូល (-)'
        : 'Not Joined (-)';

    const uniText = isReceived
      ? isKm
        ? 'បានទទួល (Received)'
        : 'Received (បានទទួល)'
      : isKm
        ? 'មិនទាន់មាន (Not Yet)'
        : 'Not Yet (មិនទាន់មាន)';

    const jerseyNoDisplay = member.jersey_number ? `#${member.jersey_number}` : '-';
    const updatedDisplay = member.updated_at ? formatDate(member.updated_at) : '-';

    const cells = [
      numberCell(`A${r}`, 6, index + 1),
      stringCell(`B${r}`, baseStyle, member.jersey_name || ''),
      stringCell(`C${r}`, baseStyle, member.full_name || member.jersey_name || ''),
      stringCell(`D${r}`, 6, jerseyNoDisplay),
      stringCell(`E${r}`, baseStyle, member.position || '-'),
      stringCell(`F${r}`, baseStyle, member.phone || '-'),
      stringCell(`G${r}`, isJoined ? 7 : 8, tgText),
      stringCell(`H${r}`, isReceived ? 7 : 8, uniText),
      stringCell(`I${r}`, baseStyle, member.notes || ''),
      stringCell(`J${r}`, baseStyle, updatedDisplay),
    ].join('');

    rowsXml.push(`<row r="${r}" spans="1:10" customHeight="1" ht="26">${cells}</row>`);
  });

  // Grand Total Footer Row
  const footerRowNum = members.length + 5;
  const footerLabel = isKm ? `សរុបកីឡាករទាំងអស់: ${totalCount} នាក់` : `Total Squad Members: ${totalCount}`;
  const tgSummary = `${tgJoinedCount} / ${totalCount}`;
  const uniSummary = `${uniformReceivedCount} / ${totalCount}`;

  const footerCells = [
    emptyStyledCell(`A${footerRowNum}`, 9),
    stringCell(`B${footerRowNum}`, 9, footerLabel),
    emptyStyledCell(`C${footerRowNum}`, 9),
    emptyStyledCell(`D${footerRowNum}`, 9),
    emptyStyledCell(`E${footerRowNum}`, 9),
    emptyStyledCell(`F${footerRowNum}`, 9),
    stringCell(`G${footerRowNum}`, 9, tgSummary),
    stringCell(`H${footerRowNum}`, 9, uniSummary),
    emptyStyledCell(`I${footerRowNum}`, 9),
    emptyStyledCell(`J${footerRowNum}`, 9),
  ].join('');
  rowsXml.push(`<row r="${footerRowNum}" spans="1:10" customHeight="1" ht="28">${footerCells}</row>`);

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="24729"/>
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/>
  </bookViews>
  <sheets>
    <sheet name="Team Members" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  // Styles: 0=default, 1=title navy, 2=summary light blue, 3=header blue, 4=cell, 5=cell striped, 6=center bold, 7=green badge, 8=amber badge, 9=footer navy
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="6">
    <font><sz val="11"/><color rgb="FF101C32"/><name val="Kantumruy Pro"/><family val="2"/></font>
    <font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Kantumruy Pro"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF101C32"/><name val="Kantumruy Pro"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Kantumruy Pro"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF16A34A"/><name val="Kantumruy Pro"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FFB45309"/><name val="Kantumruy Pro"/><family val="2"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF101C32"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:J${footerRowNum}"/>
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A5" sqref="A5"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="24"/>
  <cols>
    <col min="1" max="1" width="10" customWidth="1"/>
    <col min="2" max="2" width="24" customWidth="1"/>
    <col min="3" max="3" width="24" customWidth="1"/>
    <col min="4" max="4" width="12" customWidth="1"/>
    <col min="5" max="5" width="18" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="20" customWidth="1"/>
    <col min="8" max="8" width="22" customWidth="1"/>
    <col min="9" max="9" width="28" customWidth="1"/>
    <col min="10" max="10" width="22" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowsXml.join('\n    ')}
  </sheetData>
  <mergeCells count="2">
    <mergeCell ref="A1:J1"/>
    <mergeCell ref="A2:J2"/>
  </mergeCells>
  <pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
  <pageSetup paperSize="9" orientation="landscape"/>
</worksheet>`;

  return buildZipBytes([
    { name: '[Content_Types].xml', data: contentTypesXml },
    { name: '_rels/.rels', data: relsXml },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml },
    { name: 'xl/styles.xml', data: stylesXml },
    { name: 'xl/sharedStrings.xml', data: sharedStrings.toXml() },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml },
  ]);
}

/**
 * Generates and downloads the Team Member Directory report as a real Microsoft Excel (.xlsx) workbook.
 */
export function exportMembersToExcel(members = [], options = {}) {
  const bytes = buildMembersXlsxBytes(members, options);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = options.filename || `Khmer_Team_One_Members_${datePart}.xlsx`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
