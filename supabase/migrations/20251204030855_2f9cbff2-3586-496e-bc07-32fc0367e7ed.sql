-- Create reactions enum
CREATE TYPE public.reaction_type AS ENUM ('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry');

-- Create reactions table (replacing simple likes)
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  reaction reaction_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create hashtags table
CREATE TABLE public.hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create post_hashtags junction table
CREATE TABLE public.post_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  hashtag_id UUID REFERENCES public.hashtags(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(post_id, hashtag_id)
);

-- Create post_tags table for tagging friends
CREATE TABLE public.post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  tagged_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, tagged_user_id)
);

-- Add new columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS feeling TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS is_reel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_duration INTEGER,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'completed';

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- Reactions policies
CREATE POLICY "Reactions viewable by everyone" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Users can create reactions" ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON public.reactions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own reactions" ON public.reactions FOR UPDATE USING (auth.uid() = user_id);

-- Hashtags policies
CREATE POLICY "Hashtags viewable by everyone" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create hashtags" ON public.hashtags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Post hashtags policies
CREATE POLICY "Post hashtags viewable by everyone" ON public.post_hashtags FOR SELECT USING (true);
CREATE POLICY "Post owners can manage hashtags" ON public.post_hashtags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

-- Post tags policies
CREATE POLICY "Post tags viewable by everyone" ON public.post_tags FOR SELECT USING (true);
CREATE POLICY "Post owners can create tags" ON public.post_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "Post owners can delete tags" ON public.post_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);