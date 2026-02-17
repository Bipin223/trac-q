-- ============================================
-- FIX MISSING RELATIONSHIPS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Fix pending_transactions relationships
DO $$
BEGIN
    -- Check if columns exist and add FKs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='sender_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='pending_transactions_sender_id_fkey') THEN
            ALTER TABLE public.pending_transactions 
                ADD CONSTRAINT pending_transactions_sender_id_fkey 
                FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='receiver_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='pending_transactions_receiver_id_fkey') THEN
            ALTER TABLE public.pending_transactions 
                ADD CONSTRAINT pending_transactions_receiver_id_fkey 
                FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- If columns are named from_user_id/to_user_id (as in some docs)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='from_user_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='pending_transactions_from_user_id_fkey') THEN
            ALTER TABLE public.pending_transactions 
                ADD CONSTRAINT pending_transactions_from_user_id_fkey 
                FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pending_transactions' AND column_name='to_user_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='pending_transactions_to_user_id_fkey') THEN
            ALTER TABLE public.pending_transactions 
                ADD CONSTRAINT pending_transactions_to_user_id_fkey 
                FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 2. Fix friends relationships
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='friends_friend_id_fkey') THEN
        ALTER TABLE public.friends 
            ADD CONSTRAINT friends_friend_id_fkey 
            FOREIGN KEY (friend_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
