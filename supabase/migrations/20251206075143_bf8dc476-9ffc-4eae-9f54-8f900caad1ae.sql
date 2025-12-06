
-- ============================================
-- FINAL SECURITY FIX MIGRATION V5 - Groups & Pages
-- ============================================

-- Fix groups policy: respect is_public setting
DROP POLICY IF EXISTS "Groups require authentication" ON public.groups;

CREATE POLICY "Groups respect privacy"
ON public.groups
FOR SELECT
USING (
  is_public = true  -- Public groups visible to all
  OR created_by = auth.uid()  -- Creator can see their groups
  OR public.is_group_member(id, auth.uid())  -- Members can see their groups
);

-- Add visibility column to pages
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

-- Fix pages policy: respect published status
DROP POLICY IF EXISTS "Pages require authentication" ON public.pages;

CREATE POLICY "Pages respect publish status"
ON public.pages
FOR SELECT
USING (
  is_published = true  -- Published pages visible to authenticated users
  OR created_by = auth.uid()  -- Creator can see their pages
);

-- Fix likes policy: properly enforce show_likes
DROP POLICY IF EXISTS "Likes visible with privacy enforcement" ON public.likes;

CREATE POLICY "Likes respect user privacy"
ON public.likes
FOR SELECT
USING (
  user_id = auth.uid()  -- User can always see their own likes
  OR (
    public.can_view_post(post_id, auth.uid())  -- Can view the post
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND show_likes = true)  -- Liker allows
    )
  )
);
