-- Create upload_queue table for persistent upload tracking
CREATE TABLE public.upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  content_hash TEXT,
  tus_upload_url TEXT,
  object_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'paused', 'processing', 'complete', 'failed')),
  bytes_uploaded BIGINT DEFAULT 0,
  upload_speed REAL DEFAULT 0,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create video_processing_jobs table for server-side processing
CREATE TABLE public.video_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  upload_queue_id UUID REFERENCES public.upload_queue(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'transcoding', 'generating_thumbnail', 'complete', 'failed')),
  progress INTEGER DEFAULT 0,
  qualities JSONB DEFAULT '[]'::jsonb,
  thumbnail_urls JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.upload_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for upload_queue
CREATE POLICY "Users can view their own uploads"
  ON public.upload_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads"
  ON public.upload_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads"
  ON public.upload_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads"
  ON public.upload_queue FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for video_processing_jobs
CREATE POLICY "Users can view their own processing jobs"
  ON public.video_processing_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing jobs"
  ON public.video_processing_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processing jobs"
  ON public.video_processing_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_upload_queue_updated_at
  BEFORE UPDATE ON public.upload_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_processing_jobs_updated_at
  BEFORE UPDATE ON public.video_processing_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for upload status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_processing_jobs;