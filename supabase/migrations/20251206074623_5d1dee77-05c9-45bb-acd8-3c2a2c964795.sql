
-- ============================================
-- COMPREHENSIVE SECURITY FIX MIGRATION V2
-- ============================================

-- Fix profiles policy: require authentication for profile access
DROP POLICY IF EXISTS "Users can view basic public profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL  -- Require authentication
  AND (
    auth.uid() = id  -- Owner can see everything
    OR profile_visibility = 'public'  -- Public profiles visible to authenticated users
    OR (profile_visibility = 'friends' AND public.are_friends(id, auth.uid()))
  )
);

-- Fix follows policy: respect BOTH users' privacy settings
DROP POLICY IF EXISTS "Follows visible to participants or if public" ON public.follows;

CREATE POLICY "Follows visible with proper privacy"
ON public.follows
FOR SELECT
USING (
  auth.uid() IS NOT NULL  -- Require authentication
  AND (
    auth.uid() = follower_id  -- User can see their own follows
    OR auth.uid() = following_id  -- User can see who follows them
    -- Only show to others if BOTH users allow it
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = follower_id AND show_following = true)
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = following_id AND show_followers = true)
    )
  )
);

-- Fix likes policy: enforce show_likes setting
DROP POLICY IF EXISTS "Likes visible based on post privacy" ON public.likes;

CREATE POLICY "Likes visible with privacy enforcement"
ON public.likes
FOR SELECT
USING (
  auth.uid() IS NOT NULL  -- Require authentication
  AND (
    user_id = auth.uid()  -- User can see their own likes
    OR (
      public.can_view_post(post_id, auth.uid())  -- Can view the post
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND show_likes = true)  -- Liker allows showing
    )
  )
);

-- Fix reactions policy: require authentication
DROP POLICY IF EXISTS "Reactions visible based on post privacy" ON public.reactions;

CREATE POLICY "Reactions visible to authenticated users"
ON public.reactions
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.can_view_post(post_id, auth.uid())
);

-- Fix comments policy: require authentication
DROP POLICY IF EXISTS "Comments visible based on post privacy" ON public.comments;

CREATE POLICY "Comments visible to authenticated users"
ON public.comments
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.can_view_post(post_id, auth.uid())
);

-- Add privacy column to stories
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS privacy text DEFAULT 'public' CHECK (privacy IN ('public', 'friends'));

-- Fix stories policy: respect privacy settings
DROP POLICY IF EXISTS "Stories visible to authenticated users" ON public.stories;

CREATE POLICY "Stories respect privacy settings"
ON public.stories
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND expires_at > now()
  AND (
    user_id = auth.uid()  -- Owner can see own stories
    OR privacy = 'public'  -- Public stories visible to all authenticated
    OR (privacy = 'friends' AND public.are_friends(user_id, auth.uid()))
  )
);

-- Add privacy column to events
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS privacy text DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'invite_only'));

-- Fix events policy: respect privacy
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;

CREATE POLICY "Events respect privacy settings"
ON public.events
FOR SELECT
USING (
  privacy = 'public'
  OR created_by = auth.uid()
  OR (privacy = 'invite_only' AND public.is_event_attendee(id, auth.uid()))
);

-- Fix event attendees: add proper privacy
DROP POLICY IF EXISTS "Event attendees visible to attendees and creator" ON public.event_attendees;

CREATE POLICY "Event attendees private to attendees"
ON public.event_attendees
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()  -- User can see their own attendance
    OR public.is_event_attendee(event_id, auth.uid())  -- Other attendees can see
    OR EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid())  -- Creator can see
  )
);

-- Fix group members: only visible to members of that group
DROP POLICY IF EXISTS "Group members visible to group members only" ON public.group_members;

CREATE POLICY "Group members visible to members only"
ON public.group_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()  -- User can see their own memberships
    OR public.is_group_member(group_id, auth.uid())  -- Members can see other members
  )
);

-- Fix page followers policy
DROP POLICY IF EXISTS "Page followers visible to page owner" ON public.page_followers;

CREATE POLICY "Page followers private"
ON public.page_followers
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()  -- User can see their own follows
    OR EXISTS (SELECT 1 FROM public.pages WHERE id = page_id AND created_by = auth.uid())  -- Page owner can see
  )
);

-- Fix post hashtags: require authentication
DROP POLICY IF EXISTS "Post hashtags respect post privacy" ON public.post_hashtags;

CREATE POLICY "Post hashtags require auth"
ON public.post_hashtags
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.can_view_post(post_id, auth.uid())
);

-- Fix post tags: require authentication
DROP POLICY IF EXISTS "Post tags respect post privacy" ON public.post_tags;

CREATE POLICY "Post tags require auth"
ON public.post_tags
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.can_view_post(post_id, auth.uid())
);
