-- Create saved_posts table
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create watch_history table
CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_invitations table
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, invited_user_id)
);

-- Create page_invitations table
CREATE TABLE IF NOT EXISTS public.page_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(page_id, invited_user_id)
);

-- Enable RLS
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_posts
CREATE POLICY "Users can view own saved posts"
  ON public.saved_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
  ON public.saved_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
  ON public.saved_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for watch_history
CREATE POLICY "Users can view own watch history"
  ON public.watch_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to watch history"
  ON public.watch_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for group_invitations
CREATE POLICY "Users can view own group invitations"
  ON public.group_invitations FOR SELECT
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);

CREATE POLICY "Users can send group invitations"
  ON public.group_invitations FOR INSERT
  WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can update own group invitations"
  ON public.group_invitations FOR UPDATE
  USING (auth.uid() = invited_user_id);

-- RLS Policies for page_invitations
CREATE POLICY "Users can view own page invitations"
  ON public.page_invitations FOR SELECT
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);

CREATE POLICY "Users can send page invitations"
  ON public.page_invitations FOR INSERT
  WITH CHECK (auth.uid() = invited_by);