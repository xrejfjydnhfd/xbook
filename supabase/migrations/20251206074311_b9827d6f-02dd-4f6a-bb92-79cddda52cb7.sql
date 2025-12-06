
-- ============================================
-- COMPREHENSIVE SECURITY FIX MIGRATION
-- ============================================

-- 1. Add privacy settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_followers boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_following boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_likes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private'));

-- 2. Create helper function to check if users are friends
CREATE OR REPLACE FUNCTION public.are_friends(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (user_id = _user_id AND friend_id = _other_user_id)
        OR (user_id = _other_user_id AND friend_id = _user_id)
      )
  )
$$;

-- 3. Create helper function to check post visibility
CREATE OR REPLACE FUNCTION public.can_view_post(_post_id uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = _post_id
      AND (
        p.privacy = 'public'
        OR p.user_id = _viewer_id
        OR (p.privacy = 'friends' AND public.are_friends(p.user_id, _viewer_id))
      )
  )
$$;

-- 4. Create helper function to check if user is group member
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

-- 5. Create helper function to check if user is event attendee
CREATE OR REPLACE FUNCTION public.is_event_attendee(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_attendees
    WHERE event_id = _event_id AND user_id = _user_id
  )
$$;

-- ============================================
-- DROP EXISTING INSECURE POLICIES
-- ============================================

-- Posts policies
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

-- Comments policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

-- Likes policies
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;

-- Reactions policies
DROP POLICY IF EXISTS "Reactions viewable by everyone" ON public.reactions;

-- Follows policies
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;

-- Group members policies
DROP POLICY IF EXISTS "Group members viewable by all" ON public.group_members;

-- Event attendees policies
DROP POLICY IF EXISTS "Event attendees viewable by all" ON public.event_attendees;

-- Page followers policies
DROP POLICY IF EXISTS "Page followers viewable by all" ON public.page_followers;

-- Post hashtags policies
DROP POLICY IF EXISTS "Post hashtags viewable by everyone" ON public.post_hashtags;

-- Post tags policies
DROP POLICY IF EXISTS "Post tags viewable by everyone" ON public.post_tags;

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- ============================================
-- CREATE NEW SECURE POLICIES
-- ============================================

-- PROFILES: Only show public info to non-owners, full info to owner
CREATE POLICY "Users can view basic public profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id  -- Owner can see everything
  OR profile_visibility = 'public'  -- Public profiles visible to all
  OR (profile_visibility = 'friends' AND public.are_friends(id, auth.uid()))  -- Friends can see friends-only profiles
);

-- POSTS: Respect privacy settings
CREATE POLICY "Posts respect privacy settings"
ON public.posts
FOR SELECT
USING (
  privacy = 'public'
  OR user_id = auth.uid()
  OR (privacy = 'friends' AND public.are_friends(user_id, auth.uid()))
);

-- COMMENTS: Only visible if parent post is visible
CREATE POLICY "Comments visible based on post privacy"
ON public.comments
FOR SELECT
USING (
  public.can_view_post(post_id, auth.uid())
);

-- LIKES: Only visible if parent post is visible
CREATE POLICY "Likes visible based on post privacy"
ON public.likes
FOR SELECT
USING (
  public.can_view_post(post_id, auth.uid())
);

-- REACTIONS: Only visible if parent post is visible
CREATE POLICY "Reactions visible based on post privacy"
ON public.reactions
FOR SELECT
USING (
  public.can_view_post(post_id, auth.uid())
);

-- FOLLOWS: Only owner can see their follow lists by default
CREATE POLICY "Follows visible to participants or if public"
ON public.follows
FOR SELECT
USING (
  auth.uid() = follower_id
  OR auth.uid() = following_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = follower_id AND show_following = true
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = following_id AND show_followers = true
  )
);

-- GROUP MEMBERS: Only visible to other group members
CREATE POLICY "Group members visible to group members only"
ON public.group_members
FOR SELECT
USING (
  public.is_group_member(group_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = group_id AND is_public = true
  )
);

-- EVENT ATTENDEES: Only visible to other attendees or event creator
CREATE POLICY "Event attendees visible to attendees and creator"
ON public.event_attendees
FOR SELECT
USING (
  public.is_event_attendee(event_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.events
    WHERE id = event_id AND created_by = auth.uid()
  )
);

-- PAGE FOLLOWERS: Visible to page owner only (count can be shown separately)
CREATE POLICY "Page followers visible to page owner"
ON public.page_followers
FOR SELECT
USING (
  auth.uid() = user_id  -- User can see their own follows
  OR EXISTS (
    SELECT 1 FROM public.pages
    WHERE id = page_id AND created_by = auth.uid()
  )
);

-- POST HASHTAGS: Visible based on post privacy
CREATE POLICY "Post hashtags respect post privacy"
ON public.post_hashtags
FOR SELECT
USING (
  public.can_view_post(post_id, auth.uid())
);

-- POST TAGS: Visible based on post privacy
CREATE POLICY "Post tags respect post privacy"
ON public.post_tags
FOR SELECT
USING (
  public.can_view_post(post_id, auth.uid())
);

-- ============================================
-- ENSURE MESSAGES ARE SECURE
-- ============================================
-- Messages already have correct RLS, but let's verify the policy exists
-- The existing policy only allows sender/receiver to view, which is correct

-- ============================================
-- STORIES: Add privacy check
-- ============================================
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;

CREATE POLICY "Stories visible to authenticated users"
ON public.stories
FOR SELECT
USING (
  expires_at > now()
  AND auth.uid() IS NOT NULL
);
