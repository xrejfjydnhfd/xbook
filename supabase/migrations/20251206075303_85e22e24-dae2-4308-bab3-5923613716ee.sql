
-- ============================================
-- FINAL SECURITY FIX MIGRATION V7 - Profile deletion & likes update
-- ============================================

-- Allow users to delete their own profiles (GDPR compliance)
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);

-- Allow users to update their own likes
CREATE POLICY "Users can update own likes"
ON public.likes
FOR UPDATE
USING (auth.uid() = user_id);

-- Fix follows policy: each user controls only their own visibility
DROP POLICY IF EXISTS "Follows visible with proper privacy" ON public.follows;

CREATE POLICY "Follows respect individual privacy"
ON public.follows
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = follower_id  -- User can see who they follow
    OR auth.uid() = following_id  -- User can see who follows them
    -- Show to others only if the respective user allows it
    OR (
      -- For viewing "who does X follow": check if X allows showing following
      EXISTS (SELECT 1 FROM public.profiles WHERE id = follower_id AND show_following = true)
    )
  )
);
