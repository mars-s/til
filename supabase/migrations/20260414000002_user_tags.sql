-- Migration: Add user_tags table for persistent tag management
CREATE TABLE IF NOT EXISTS user_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_tags" ON user_tags
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
