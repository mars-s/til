-- Migration: Add extended properties to tasks
-- Adds support for inline description blocks and JSONB schema-less nested subtasks

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;
