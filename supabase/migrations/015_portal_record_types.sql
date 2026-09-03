-- 자료 유형에 '승소사례' 추가 — 판결문 없이 서술형으로 올리는 성공사례 (대표 지시 2026-08-29)
ALTER TABLE portal_records DROP CONSTRAINT IF EXISTS portal_records_type_check;
ALTER TABLE portal_records
  ADD CONSTRAINT portal_records_type_check
  CHECK (type in ('상담기록', '수임내역', '판결문', '승소사례', '기타'));
