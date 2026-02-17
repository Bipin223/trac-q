-- ============================================
-- FIX MISSING RELATIONSHIPS & COLUMNS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Ensure columns match the code (if they were named differently)
DO $$
BEGIN
    -- Check if sender_id exists and rename it to from_user_id if from_user_id doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='sender_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='from_user_id') THEN
        ALTER TABLE public.pending_transactions RENAME COLUMN sender_id TO from_user_id;
    END IF;

    -- Check if receiver_id exists and rename it to to_user_id if to_user_id doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='receiver_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='to_user_id') THEN
        ALTER TABLE public.pending_transactions RENAME COLUMN receiver_id TO to_user_id;
    END IF;
    
    -- Check for acceptance columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='sender_accepted') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='from_user_accepted') THEN
        ALTER TABLE public.pending_transactions RENAME COLUMN sender_accepted TO from_user_accepted;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='receiver_accepted') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='to_user_accepted') THEN
        ALTER TABLE public.pending_transactions RENAME COLUMN receiver_accepted TO to_user_accepted;
    END IF;
END $$;

-- 2. Add foreign keys to profiles table for easier joining (even if refactoring removed join dependency)
-- This helps Supabase understand the relationship for other parts of the system
DO $$
BEGIN
    -- Add FKs if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='pending_transactions_from_user_id_profiles_fkey') THEN
        ALTER TABLE public.pending_transactions 
            ADD CONSTRAINT pending_transactions_from_user_id_profiles_fkey 
            FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='pending_transactions_to_user_id_profiles_fkey') THEN
        ALTER TABLE public.pending_transactions 
            ADD CONSTRAINT pending_transactions_to_user_id_profiles_fkey 
            FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='friends_friend_id_profiles_fkey') THEN
        ALTER TABLE public.friends 
            ADD CONSTRAINT friends_friend_id_profiles_fkey 
            FOREIGN KEY (friend_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
