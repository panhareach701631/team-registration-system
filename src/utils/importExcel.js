/**
 * Pure-JS Excel (.xlsx) & CSV Importer for Team Member Directory.
 * Supports:
 * 1. CSV files (including reports exported from Excel / Google Sheets / Khmer Team One)
 * 2. OOXML .xlsx workbooks (STORE & DEFLATE entries, inlineStr & sharedStrings)
 */

function parseCsvRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((cell) => cell.trim());
}

function cleanPlaceholder(val) {
  const s = String(val ?? '').trim();
  if (!s || s === '-' || s === '—' || s === 'N/A') return '';
  return s;
}

function normalizeImportedRow(cols) {
  const joinedRow = cols.join(' ').toLowerCase();
  if (
    joinedRow.includes('ក្រុមខ្មែរតែមួយ') ||
    joinedRow.includes('khmer team one') ||
    joinedRow.includes('សរុបសមាជិក') ||
    joinedRow.includes('សរុបកីឡាករ') ||
    joinedRow.includes('total squad') ||
    joinedRow.includes('ឈ្មោះលើអាវ') ||
    joinedRow.includes('jersey name')
  ) {
    return null;
  }

  // Expected column layout:
  // [0: No, 1: Jersey Name, 2: Full Name, 3: Jersey #, 4: Position, 5: Phone, 6: Telegram, 7: Uniform, 8: Notes]
  const firstCol = String(cols[0] ?? '').trim();
  const hasIndexCol = /^\d+$/.test(firstCol) || firstCol === '';

  const offset = hasIndexCol ? 1 : 0;
  const jerseyName = cleanPlaceholder(cols[offset]);
  if (!jerseyName) return null;

  const fullName = cleanPlaceholder(cols[offset + 1]) || jerseyName;
  const rawJerseyNo = cleanPlaceholder(cols[offset + 2]).replace(/^#/, '').trim();
  const position = cleanPlaceholder(cols[offset + 3]);
  const phone = cleanPlaceholder(cols[offset + 4]);
  const tgRaw = String(cols[offset + 5] ?? '').toLowerCase();
  const uniRaw = String(cols[offset + 6] ?? '').toLowerCase();
  const notes = cleanPlaceholder(cols[offset + 7]);

  const telegram_status =
    tgRaw.includes('not') || tgRaw.includes('មិនទាន់') || tgRaw.trim() === '-'
      ? 'NOT_JOINED'
      : tgRaw.includes('joined') || tgRaw.includes('បញ្ចូលរួច')
        ? 'JOINED'
        : 'NOT_JOINED';

  const uniform_status =
    uniRaw.includes('received') || uniRaw.includes('បានទទួល')
      ? 'RECEIVED'
      : 'NOT_YET';

  return {
    jersey_name: jerseyName,
    full_name: fullName,
    jersey_number: rawJerseyNo,
    position,
    phone,
    telegram_status,
    uniform_status,
    notes,
  };
}

/**
 * Parses CSV text (UTF-8 / BOM supported) into normalized member payload objects.
 */
export function parseMembersCsvText(csvText) {
  const cleaned = String(csvText || '').replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim() !== '');
  const members = [];

  for (const line of lines) {
    const cols = parseCsvRow(line);
    if (cols.length < 2) continue;
    const item = normalizeImportedRow(cols);
    if (item) members.push(item);
  }

  return members;
}

async function inflateRawBytes(compressedBytes) {
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([compressedBytes])
      .stream()
      .pipeThrough(new DecompressionStream('deflate-raw'));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  }
  throw new Error('Compressed .xlsx requires a modern browser or CSV format');
}

async function readZipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder('utf-8');
  const entries = {};

  // Locate End of Central Directory (PK\x05\x06) scanning backwards
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid .xlsx file (ZIP directory not found)');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);

  for (let i = 0; i < totalEntries; i += 1) {
    if (view.getUint32(cdOffset, true) !== 0x02014b50) break;

    const method = view.getUint16(cdOffset + 10, true);
    const compressedSize = view.getUint32(cdOffset + 20, true);
    const nameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);

    const fileName = decoder.decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen));
    cdOffset += 46 + nameLen + extraLen + commentLen;

    if (fileName === 'xl/sharedStrings.xml' || fileName === 'xl/worksheets/sheet1.xml') {
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const rawSlice = bytes.subarray(dataStart, dataStart + compressedSize);

      if (method === 0) {
        entries[fileName] = decoder.decode(rawSlice);
      } else if (method === 8) {
        const inflated = await inflateRawBytes(rawSlice);
        entries[fileName] = decoder.decode(inflated);
      }
    }
  }

  return entries;
}

function unescapeXml(str) {
  return String(str ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function colRefToIndex(ref) {
  const letters = (ref || '').replace(/\d+/g, '').toUpperCase();
  let index = 0;
  for (let i = 0; i < letters.length; i += 1) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return Math.max(0, index - 1);
}

/**
 * Parses an OOXML .xlsx byte array into normalized member payload objects.
 */
export async function parseMembersXlsxBytes(uint8Array) {
  const entries = await readZipEntries(uint8Array);
  const sheetXml = entries['xl/worksheets/sheet1.xml'];
  if (!sheetXml) {
    throw new Error('Could not read worksheet data from .xlsx file');
  }

  const sharedStrings = [];
  if (entries['xl/sharedStrings.xml']) {
    const siMatches = entries['xl/sharedStrings.xml'].matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g);
    for (const match of siMatches) {
      const tMatches = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) =>
        unescapeXml(m[1])
      );
      sharedStrings.push(tMatches.join(''));
    }
  }

  const members = [];
  const rowMatches = sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g);

  for (const rowMatch of rowMatches) {
    const cols = [];
    const cellMatches = rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g);

    for (const cellMatch of cellMatches) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const refMatch = attrs.match(/\br="([A-Z]+\d+)"/i);
      const typeMatch = attrs.match(/\bt="([^"]+)"/i);
      const colIdx = refMatch ? colRefToIndex(refMatch[1]) : cols.length;
      const cellType = typeMatch ? typeMatch[1] : '';

      let cellValue = '';
      if (cellType === 'inlineStr') {
        const tMatches = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) =>
          unescapeXml(m[1])
        );
        cellValue = tMatches.join('');
      } else {
        const vMatch = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
        const rawVal = vMatch ? unescapeXml(vMatch[1]) : '';
        if (cellType === 's') {
          const idx = parseInt(rawVal, 10);
          cellValue = Number.isNaN(idx) ? '' : sharedStrings[idx] ?? '';
        } else {
          cellValue = rawVal;
        }
      }

      cols[colIdx] = cellValue.trim();
    }

    if (cols.length >= 2) {
      const item = normalizeImportedRow(cols);
      if (item) members.push(item);
    }
  }

  return members;
}

/**
 * Parses either an uploaded .xlsx or .csv File object.
 */
export async function parseMembersUploadFile(file) {
  if (!file) throw new Error('Please choose a .xlsx or .csv file');
  const lower = (file.name || '').toLowerCase();

  if (lower.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    return parseMembersCsvText(text);
  }

  if (lower.endsWith('.xlsx')) {
    const buf = await file.arrayBuffer();
    return parseMembersXlsxBytes(new Uint8Array(buf));
  }

  throw new Error('Unsupported file type. Please upload an Excel (.xlsx) or CSV (.csv) file.');
}
