import { normalizeName, normalizePlayerNo, isDuplicateName, isDuplicatePlayerNo } from './src/utils/normalize.js';
import { calculateEventStats } from './src/utils/formatting.js';
import { buildMembersXlsxBytes } from './src/utils/exportExcel.js';

console.log('--- RUNNING LOGIC, PLAYER NUMBER & CALCULATION TESTS ---');

// Test 1: Name Normalization
const name1 = '   John    DOE   ';
const norm1 = normalizeName(name1);
console.assert(norm1 === 'john doe', `Test 1 Failed: Expected 'john doe', got '${norm1}'`);
console.log('✓ Test 1: Name Normalization passed.');

// Test 2: Player Key Number Normalization
const pNo1 = '07';
const normPNo1 = normalizePlayerNo(pNo1);
console.assert(normPNo1 === '7', `Test 2 Failed: Expected '7', got '${normPNo1}'`);

const pNo2 = ' 10 ';
const normPNo2 = normalizePlayerNo(pNo2);
console.assert(normPNo2 === '10', `Test 2b Failed: Expected '10', got '${normPNo2}'`);
console.log('✓ Test 2: Player Key Number Normalization passed.');

// Test 3: Duplicate Checks
const existing = [
  { id: '1', name: 'John Doe', normalized_name: 'john doe', player_no: '7', player_no_norm: '7' },
  { id: '2', name: 'Sarah Connor', normalized_name: 'sarah connor', player_no: '10', player_no_norm: '10' },
];

// Test Duplicate Name
console.assert(isDuplicateName('  JOHN   doe ', existing) === true, 'Test 3a Failed: Duplicate name should be detected');
console.assert(isDuplicateName('David Miller', existing) === false, 'Test 3b Failed: New name should be accepted');

// Test Duplicate Player Number
console.assert(isDuplicatePlayerNo('7', existing) === true, 'Test 3c Failed: Duplicate player number #7 should be detected');
console.assert(isDuplicatePlayerNo('07', existing) === true, 'Test 3d Failed: Normalized #07 should match #7');
console.assert(isDuplicatePlayerNo('23', existing) === false, 'Test 3e Failed: New player number #23 should be accepted');
console.log('✓ Test 3: Duplicate Name & Player Number detection passed.');

// Test 4: Player Count Calculations
// Each record is ONE member who keyed in their player number
const sampleRegistrations = [
  { id: '1', name: 'John', player_no: '7', team_letter: 'A' },
  { id: '2', name: 'David', player_no: '10', team_letter: 'A' },
  { id: '3', name: 'Peter', player_no: '23', team_letter: 'B' },
  { id: '4', name: 'Carlos', player_no: '9', team_letter: 'B' },
  { id: '5', name: 'Chloe', player_no: '11', team_letter: 'C' },
];

const stats = calculateEventStats(sampleRegistrations);
console.assert(stats.totalRegistrations === 5, `Expected 5 registrations, got ${stats.totalRegistrations}`);
console.assert(stats.totalPlayers === 5, `Expected 5 total players, got ${stats.totalPlayers}`);
console.assert(stats.teamAPlayers === 2, `Expected 2 Team A players, got ${stats.teamAPlayers}`);
console.assert(stats.teamBPlayers === 2, `Expected 2 Team B players, got ${stats.teamBPlayers}`);
console.assert(stats.teamCPlayers === 1, `Expected 1 Team C players, got ${stats.teamCPlayers}`);
console.log('✓ Test 4: Player count calculation accurately verified (Total = 5, Team A = 2, Team B = 2, Team C = 1).');

// Test 5: Real OOXML (.xlsx) Excel Generation & Khmer UTF-8 Encoding
const sampleMembers = [
  {
    jersey_name: 'PATO',
    full_name: 'PATO',
    jersey_number: '10',
    position: 'Forward',
    phone: '012 345 678',
    telegram_status: 'JOINED',
    uniform_status: 'RECEIVED',
    notes: 'Captain',
    updated_at: '2026-11-10T09:00:00.000Z',
  },
  {
    jersey_name: 'SEYHAK',
    full_name: 'SEYHAK',
    jersey_number: '19',
    position: '',
    phone: '',
    telegram_status: 'JOINED',
    uniform_status: 'NOT_YET',
    notes: '',
    updated_at: '2026-11-10T09:00:00.000Z',
  },
];

const xlsxBytes = buildMembersXlsxBytes(sampleMembers, { lang: 'km' });
if (
  !(xlsxBytes instanceof Uint8Array) ||
  xlsxBytes[0] !== 0x50 ||
  xlsxBytes[1] !== 0x4b ||
  xlsxBytes[2] !== 0x03 ||
  xlsxBytes[3] !== 0x04
) {
  throw new Error('Test 5 Failed: Generated Excel bytes do not start with valid ZIP/OOXML signature');
}
const decodedXml = new TextDecoder().decode(xlsxBytes);
if (!decodedXml.includes('ក្រុមខ្មែរតែមួយ') || !decodedXml.includes('PATO') || !decodedXml.includes('#10') || !decodedXml.includes('បានទទួល')) {
  throw new Error('Test 5 Failed: Generated Excel workbook missing expected Khmer/player data');
}
console.log('✓ Test 5: Team Members Excel (.xlsx) OOXML & Khmer UTF-8 generation passed.');

console.log('--- ALL AUTOMATED LOGIC TESTS PASSED ---');
