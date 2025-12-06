
-- ============================================
-- FINAL SECURITY FIX MIGRATION V6 - Missing UPDATE policies
-- ============================================

-- Allow users to update their own stories
CREATE POLICY "Users can update own stories"
ON public.stories
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to update their saved posts
CREATE POLICY "Users can update own saved posts"
ON public.saved_posts
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to update their watch history
CREATE POLICY "Users can update own watch history"
ON public.watch_history
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to update their page follows
CREATE POLICY "Users can update own page follows"
ON public.page_followers
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to update their follows
CREATE POLICY "Users can update own follows"
ON public.follows
FOR UPDATE
USING (auth.uid() = follower_id);

-- Allow post owners to update post tags
CREATE POLICY "Post owners can update tags"
ON public.post_tags
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_tags.post_id 
    AND posts.user_id = auth.uid()
  )
);

-- Allow post owners to update post hashtags
CREATE POLICY "Post owners can update hashtags"
ON public.post_hashtags
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_hashtags.post_id 
    AND posts.user_id = auth.uid()
  )
);

-- Allow admins to manage hashtags
CREATE POLICY "Admins can update hashtags"
ON public.hashtags
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete hashtags"
ON public.hashtags
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
