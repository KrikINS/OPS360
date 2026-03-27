-- Migration: Fix RLS Violations for Admin Access Control
-- Created: 2026-03-26 09:05:00
-- Purpose: Allow 'Admin/Owner' role to manage profiles and branch allotments.

BEGIN;

-- 1. Ensure RLS is enabled on target tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Check if table exists before altering
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_branch_access') THEN
        ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 2. Profiles: Administrative Management Policies

-- Drop existing if they conflict
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Update Policy: Admins can update any profile
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin/Owner'
);

-- Insert Policy: Admins can provision new accounts
CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin/Owner'
);

-- Select Policy: Admins can view all profiles; users can view their own
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin/Owner' OR
  id = auth.uid()
);

-- 3. User Branch Access: Administrative Management Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_branch_access') THEN
        DROP POLICY IF EXISTS "Admins have full access to branch allotments" ON public.user_branch_access;
        
        CREATE POLICY "Admins have full access to branch allotments" 
        ON public.user_branch_access 
        FOR ALL 
        TO authenticated 
        USING (
          (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin/Owner'
        )
        WITH CHECK (
          (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin/Owner'
        );
    END IF;
END $$;

COMMIT;
