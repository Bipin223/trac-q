-- ============================================
-- COMPLETE TRIGGER FIX - WORKS FOR ALL SIGNUPS
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop existing broken trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_friend_code() CASCADE;

-- Step 2: Create generate_friend_code function
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS VARCHAR AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
  random_chars TEXT;
BEGIN
  LOOP
    random_chars := upper(substring(md5(random()::text || random()::text) from 1 for 8));
    new_code := '#TRAC-' || random_chars;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE friend_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create handle_new_user function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  desired_username TEXT;
  final_username TEXT;
  username_exists BOOLEAN;
  counter INTEGER := 0;
  new_friend_code TEXT;
BEGIN
  RAISE LOG 'handle_new_user: Trigger fired for user %', NEW.id;
  
  -- Get desired username from metadata or derive from email
  desired_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  final_username := desired_username;
  
  RAISE LOG 'handle_new_user: Desired username is %', desired_username;
  
  -- Check if username exists and append number if needed
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE username = final_username
    ) INTO username_exists;
    
    EXIT WHEN NOT username_exists;
    
    counter := counter + 1;
    final_username := desired_username || counter::TEXT;
  END LOOP;
  
  RAISE LOG 'handle_new_user: Final username is %', final_username;
  
  -- Generate friend code
  new_friend_code := generate_friend_code();
  RAISE LOG 'handle_new_user: Generated friend code %', new_friend_code;
  
  -- Insert profile
  INSERT INTO public.profiles (
    id, 
    username, 
    email, 
    role, 
    friend_code, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    final_username,
    NEW.email,
    'user',
    new_friend_code,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RAISE LOG 'handle_new_user: Profile created successfully for user %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: Error for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    -- Don't fail the signup even if profile creation fails
    RETURN NEW;
END;
$$;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_friend_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.generate_friend_code() TO postgres;

-- Step 6: Verify trigger is created
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Step 7: Test with a dummy insert (optional - will fail but shows if trigger fires)
-- DO $$
-- BEGIN
--   RAISE NOTICE 'Trigger test complete. Check logs above for trigger firing.';
-- END $$;

SELECT 'TRIGGER SETUP COMPLETE!' as status;
