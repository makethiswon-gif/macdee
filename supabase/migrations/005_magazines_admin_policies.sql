-- ============================================================
-- Magazine Admin Write Policies
-- Run in Supabase SQL Editor
-- ============================================================

-- Allow INSERT for service role (admin writes)
CREATE POLICY "magazines_admin_insert" ON magazines
  FOR INSERT WITH CHECK (true);

-- Allow UPDATE for service role (admin edits)
CREATE POLICY "magazines_admin_update" ON magazines
  FOR UPDATE USING (true);

-- Allow DELETE for service role (admin deletes)
CREATE POLICY "magazines_admin_delete" ON magazines
  FOR DELETE USING (true);

-- Also allow SELECT for all statuses (admin reads drafts too)
CREATE POLICY "magazines_admin_select" ON magazines
  FOR SELECT USING (true);
