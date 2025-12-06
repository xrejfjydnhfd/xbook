
-- ============================================
-- FINAL SECURITY FIX MIGRATION V3
-- ============================================

-- Fix posts policy: require authentication for all access
DROP POLICY IF EXISTS "Posts respect privacy settings" ON public.posts;

CREATE POLICY "Posts require auth and respect privacy"
ON public.posts
FOR SELECT
USING (
  auth.uid() IS NOT NULL  -- Require authentication
  AND (
    privacy = 'public'
    OR user_id = auth.uid()
    OR (privacy = 'friends' AND public.are_friends(user_id, auth.uid()))
  )
);

-- Fix groups policy: require authentication
DROP POLICY IF EXISTS "Groups are viewable by everyone" ON public.groups;

CREATE POLICY "Groups require authentication"
ON public.groups
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix pages policy: require authentication
DROP POLICY IF EXISTS "Pages are viewable by everyone" ON public.pages;

CREATE POLICY "Pages require authentication"
ON public.pages
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix hashtags policy: require authentication
DROP POLICY IF EXISTS "Hashtags viewable by everyone" ON public.hashtags;

CREATE POLICY "Hashtags require authentication"
ON public.hashtags
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add DELETE policies for user data control (GDPR compliance)

-- Allow users to delete their notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their messages
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow users to delete group invitations they received
CREATE POLICY "Users can delete own group invitations"
ON public.group_invitations
FOR DELETE
USING (auth.uid() = invited_user_id);

-- Allow users to delete page invitations they received
CREATE POLICY "Users can delete own page invitations"
ON public.page_invitations
FOR DELETE
USING (auth.uid() = invited_user_id);

-- Allow users to delete their watch history
CREATE POLICY "Users can delete own watch history"
ON public.watch_history
FOR DELETE
USING (auth.uid() = user_id);
