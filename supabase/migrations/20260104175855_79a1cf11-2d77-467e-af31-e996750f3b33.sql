-- Add parent_id column for nested comment replies
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for efficient nested query
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- Add video_views table for analytics
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  watched_duration INTEGER DEFAULT 0,
  view_percentage INTEGER DEFAULT 0,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on video_views
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert views
CREATE POLICY "Anyone can record video views" ON public.video_views
  FOR INSERT WITH CHECK (true);

-- Policy: Post owners can view their video analytics
CREATE POLICY "Post owners can view their video analytics" ON public.video_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts 
      WHERE posts.id = video_views.post_id 
      AND posts.user_id = auth.uid()
    )
  );

-- Create video_duets_stitches table for duet/stitch responses
CREATE TABLE IF NOT EXISTS public.video_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  response_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('duet', 'stitch')),
  stitch_trim_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on video_responses
ALTER TABLE public.video_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view video responses
CREATE POLICY "Anyone can view video responses" ON public.video_responses
  FOR SELECT USING (true);

-- Policy: Authenticated users can create video responses
CREATE POLICY "Authenticated users can create video responses" ON public.video_responses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_responses;