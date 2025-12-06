
-- ============================================
-- FINAL SECURITY FIX MIGRATION V4
-- ============================================

-- Add DELETE policy for post_hashtags
CREATE POLICY "Post owners can delete hashtags"
ON public.post_hashtags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_hashtags.post_id 
    AND posts.user_id = auth.uid()
  )
);

-- Add UPDATE policy for group_members (for role changes by group creator)
CREATE POLICY "Group creators can update member roles"
ON public.group_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM groups 
    WHERE groups.id = group_members.group_id 
    AND groups.created_by = auth.uid()
  )
);

-- Add UPDATE policy for page_invitations
CREATE POLICY "Users can update page invitations"
ON public.page_invitations
FOR UPDATE
USING (auth.uid() = invited_user_id);

-- Enable leaked password protection is not possible via SQL
-- It needs to be enabled in the Lovable Cloud settings
