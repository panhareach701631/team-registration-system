-- ====================================================================
-- SEED / SYNC ALL 44 CLUB MEMBERS FROM EXCEL REPORT INTO SUPABASE
-- Idempotent & non-destructive: updates existing match by jersey_name
-- or inserts missing rows. Safe to run in Supabase SQL Editor.
-- ====================================================================

with seed_data(jersey_name, full_name, jersey_number, position, phone, telegram_status, uniform_status, notes) as (
  values
    ('PATO', 'PATO', '10', '', '', 'JOINED', 'RECEIVED', ''),
    ('DEN', 'DEN', '77', '', '', 'JOINED', 'RECEIVED', ''),
    ('KOUNG', 'KOUNG', '26', '', '', 'JOINED', 'RECEIVED', ''),
    ('SOVEARCHA', 'SOVEARCHA', '7', '', '', 'JOINED', 'RECEIVED', ''),
    ('SOVITHYEA', 'SOVITHYEA', '9', '', '', 'JOINED', 'RECEIVED', ''),
    ('SRUN', 'SRUN', '88', '', '', 'JOINED', 'RECEIVED', ''),
    ('RITHY', 'RITHY', '66', '', '', 'NOT_JOINED', 'RECEIVED', ''),
    ('SEYHA', 'SEYHA', '17', '', '', 'JOINED', 'RECEIVED', ''),
    ('VIREAK CHHAI', 'VIREAK CHHAI', '6', '', '', 'JOINED', 'RECEIVED', ''),
    ('IM PORK', 'IM PORK', '15', '', '', 'JOINED', 'RECEIVED', ''),
    ('SAMBATH', 'SAMBATH', '8', '', '', 'JOINED', 'RECEIVED', ''),
    ('SOPHANITH', 'SOPHANITH', '18', '', '', 'JOINED', 'RECEIVED', ''),
    ('ODAM', 'ODAM', '3', '', '', 'JOINED', 'RECEIVED', ''),
    ('SOKKHAI.R', 'SOKKHAI.R', '56', '', '', 'JOINED', 'RECEIVED', ''),
    ('SORITH', 'SORITH', '4', '', '', 'JOINED', 'RECEIVED', ''),
    ('NARITH', 'NARITH', '11', '', '', 'JOINED', 'RECEIVED', ''),
    ('DAVID', 'DAVID', '20', '', '', 'NOT_JOINED', 'RECEIVED', ''),
    ('CHAN', 'CHAN', '33', '', '', 'JOINED', 'RECEIVED', ''),
    ('PANHA REACH', 'PANHA REACH', '404', '', '0968125991', 'JOINED', 'RECEIVED', ''),
    ('PICHEY', 'PICHEY', '99', '', '', 'JOINED', 'RECEIVED', ''),
    ('DA', 'DA', '25', '', '', 'JOINED', 'RECEIVED', ''),
    ('HONG', 'HONG', '67', '', '', 'JOINED', 'RECEIVED', ''),
    ('BUNTHAN', 'BUNTHAN', '79', '', '', 'JOINED', 'RECEIVED', ''),
    ('PANG VA', 'PANG VA', '27', '', '', 'JOINED', 'RECEIVED', ''),
    ('MUNYREAK', 'MUNYREAK', '12', '', '', 'JOINED', 'RECEIVED', ''),
    ('CHETRA', 'CHETRA', '16', '', '', 'JOINED', 'RECEIVED', ''),
    ('VUTH', 'VUTH', '2', '', '', 'JOINED', 'RECEIVED', ''),
    ('TORO', 'TORO', '72', '', '', 'JOINED', 'RECEIVED', ''),
    ('CHHEAN', 'CHHEAN', '14', '', '', 'JOINED', 'RECEIVED', ''),
    ('K.PHEAROM', 'K.PHEAROM', '22', '', '', 'JOINED', 'RECEIVED', ''),
    ('PHANNAK', 'PHANNAK', '23', '', '', 'JOINED', 'RECEIVED', ''),
    ('SEANG HAI', 'SEANG HAI', '43', '', '', 'NOT_JOINED', 'NOT_YET', ''),
    ('BRO THA', 'BRO THA', '97', '', '', 'JOINED', 'RECEIVED', ''),
    ('THANVA', 'THANVA', '94', '', '', 'JOINED', 'RECEIVED', ''),
    ('VANNA', 'VANNA', '69', '', '', 'JOINED', 'RECEIVED', ''),
    ('THE FINAL BOSS', 'THE FINAL BOSS', '', '', '', 'NOT_JOINED', 'NOT_YET', ''),
    ('SAORY', 'SAORY', '5', '', '', 'JOINED', 'RECEIVED', ''),
    ('PHIRAK', 'PHIRAK', '45', '', '', 'JOINED', 'RECEIVED', ''),
    ('ZEUDI', 'ZEUDI', '81', '', '', 'JOINED', 'RECEIVED', ''),
    ('SEYHAK', 'SEYHAK', '19', '', '', 'JOINED', 'NOT_YET', ''),
    ('HAN SOMRACH', 'HAN SOMRACH', '', '', '', 'JOINED', 'NOT_YET', ''),
    ('VORK VAYU', 'VORK VAYU', '28', '', '', 'JOINED', 'NOT_YET', ''),
    ('KAING MINEA', 'KAING MINEA', '28', '', '', 'JOINED', 'NOT_YET', ''),
    ('YA PHANNY', 'YA PHANNY', '86', '', '', 'JOINED', 'NOT_YET', '')
),
updated as (
  update club_members m
  set
    full_name = s.full_name,
    jersey_number = s.jersey_number,
    phone = case when s.phone <> '' then s.phone else m.phone end,
    telegram_status = s.telegram_status,
    uniform_status = s.uniform_status,
    updated_at = now()
  from seed_data s
  where lower(trim(m.jersey_name)) = lower(trim(s.jersey_name))
  returning lower(trim(m.jersey_name)) as key_name
)
insert into club_members (
  jersey_name,
  full_name,
  jersey_number,
  position,
  phone,
  telegram_status,
  uniform_status,
  notes
)
select
  s.jersey_name,
  s.full_name,
  s.jersey_number,
  s.position,
  s.phone,
  s.telegram_status,
  s.uniform_status,
  s.notes
from seed_data s
where not exists (
  select 1 from club_members m
  where lower(trim(m.jersey_name)) = lower(trim(s.jersey_name))
);
