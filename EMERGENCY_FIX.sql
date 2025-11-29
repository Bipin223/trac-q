-- ============================================
-- EMERGENCY FIX FOR EXISTING USERS
-- Run this NOW in Supabase SQL Editor
-- ============================================

-- Check how many users don't have profiles
SELECT 
  COUNT(u.id) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(u.id) - COUNT(p.id) as users_missing_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- Show which users are missing profiles
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'username' as username,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Create profiles for ALL users without them
INSERT INTO public.profiles (id, username, email, role, friend_code, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) as username,
  u.email,
  'user' as role,
  '#TRAC-' || upper(substring(md5(random()::text || u.id::text) from 1 for 8)) as friend_code,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify fix - should show 0 users_missing_profiles
SELECT 
  COUNT(u.id) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(u.id) - COUNT(p.id) as users_missing_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- Show all profiles created
SELECT 
  id,
  username,
  email,
  friend_code,
  created_at
FROM public.profiles
ORDER BY created_at DESC;
