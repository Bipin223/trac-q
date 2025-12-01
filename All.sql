-- ============================================
-- TRAC-Q COMPLETE DATABASE SETUP
-- Includes: Auth, Profiles, OTP, Favorites, Friends, Lend/Borrow
-- ============================================


-- ============================================
-- PART 0: PROFILES TABLE AND AUTO-CREATE TRIGGER
-- ============================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  friend_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.profiles;

-- Create RLS policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for service role"
ON public.profiles FOR INSERT
TO service_role
WITH CHECK (true);

-- Function to generate unique friend code (needed by trigger)
CREATE OR REPLACE FUNCTION generate_friend_code()
RETURNS VARCHAR AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
  random_chars TEXT;
BEGIN
  LOOP
    random_chars := upper(substring(md5(random()::text || random()::text) from 1 for 8));
    new_code := '#TRAC-' || random_chars;
    SELECT EXISTS(SELECT 1 FROM profiles WHERE friend_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  desired_username TEXT;
  final_username TEXT;
  username_exists BOOLEAN;
  counter INTEGER := 0;
BEGIN
  -- Get desired username from metadata or derive from email
  desired_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  final_username := desired_username;
  
  -- Check if username exists and append number if needed
  LOOP
    SELECT EXISTS(SELECT 1 FROM profiles WHERE username = final_username) INTO username_exists;
    IF NOT username_exists THEN
      EXIT;
    END IF;
    counter := counter + 1;
    final_username := desired_username || counter::TEXT;
  END LOOP;
  
  -- Insert profile with unique username
  INSERT INTO public.profiles (id, username, email, role, friend_code)
  VALUES (
    NEW.id,
    final_username,
    NEW.email,
    'user',
    generate_friend_code()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to get email from username (used in login)
CREATE OR REPLACE FUNCTION public.get_email_from_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM public.profiles
  WHERE username = p_username
  LIMIT 1;
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_from_username(TEXT) TO anon, authenticated;


-- ============================================
-- PART 1: CORE FINANCIAL TABLES
-- ============================================

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_favorite ON public.categories(user_id, type, is_favorite);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can create their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;

CREATE POLICY "Users can view their own categories"
ON public.categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
ON public.categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON public.categories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON public.categories FOR DELETE
USING (auth.uid() = user_id);

-- Create incomes table
CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency VARCHAR(20),
  recurring_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON public.incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_category_id ON public.incomes(category_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON public.incomes(income_date);
CREATE INDEX IF NOT EXISTS idx_incomes_favorite ON public.incomes(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_incomes_recurring ON public.incomes(user_id, is_recurring) WHERE is_recurring = TRUE;

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can create their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can update their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can delete their own incomes" ON public.incomes;

CREATE POLICY "Users can view their own incomes"
ON public.incomes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own incomes"
ON public.incomes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incomes"
ON public.incomes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incomes"
ON public.incomes FOR DELETE
USING (auth.uid() = user_id);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency VARCHAR(20),
  recurring_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_favorite ON public.expenses(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON public.expenses(user_id, is_recurring) WHERE is_recurring = TRUE;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can create their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

CREATE POLICY "Users can view their own expenses"
ON public.expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses"
ON public.expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
ON public.expenses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
ON public.expenses FOR DELETE
USING (auth.uid() = user_id);

-- Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  budgeted_amount DECIMAL(12, 2) NOT NULL CHECK (budgeted_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_year_month ON public.budgets(year, month);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can create their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete their own budgets" ON public.budgets;

CREATE POLICY "Users can view their own budgets"
ON public.budgets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets"
ON public.budgets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
ON public.budgets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
ON public.budgets FOR DELETE
USING (auth.uid() = user_id);

-- Create accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'investment', 'cash', 'other')),
  balance DECIMAL(12, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'NPR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(type);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can create their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;

CREATE POLICY "Users can view their own accounts"
ON public.accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts"
ON public.accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
ON public.accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
ON public.accounts FOR DELETE
USING (auth.uid() = user_id);

-- Add constraints and checks
ALTER TABLE public.incomes
DROP CONSTRAINT IF EXISTS incomes_recurring_frequency_check;

ALTER TABLE public.incomes
ADD CONSTRAINT incomes_recurring_frequency_check
CHECK (recurring_frequency IS NULL OR recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'custom'));

ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_recurring_frequency_check;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_recurring_frequency_check
CHECK (recurring_frequency IS NULL OR recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'custom'));

-- Comments
COMMENT ON COLUMN categories.is_favorite IS 'Indicates if this category is marked as favorite by the user for quick access';
COMMENT ON COLUMN incomes.recurring_frequency IS 'Frequency of recurring income: daily, weekly, monthly, yearly, or custom';
COMMENT ON COLUMN incomes.recurring_day IS 'Day of month (1-31) for monthly recurring, or day of week (0-6) for weekly recurring';
COMMENT ON COLUMN expenses.recurring_frequency IS 'Frequency of recurring expense: daily, weekly, monthly, yearly, or custom';
COMMENT ON COLUMN expenses.recurring_day IS 'Day of month (1-31) for monthly recurring, or day of week (0-6) for weekly recurring';


-- ============================================
-- PART 2: PASSWORD RESET & OTP SYSTEM
-- ============================================

-- Create password_reset_otps table
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id ON password_reset_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_otp_code ON password_reset_otps(otp_code);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);

ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own OTPs" ON password_reset_otps;
DROP POLICY IF EXISTS "Anyone can insert OTPs" ON password_reset_otps;
DROP POLICY IF EXISTS "Users can update their own OTPs" ON password_reset_otps;

CREATE POLICY "Users can read their own OTPs"
ON password_reset_otps FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert OTPs"
ON password_reset_otps FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own OTPs"
ON password_reset_otps FOR UPDATE
USING (auth.uid() = user_id);

-- Function to get user by email
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS UUID AS $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email;
  
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify and reset password using OTP
CREATE OR REPLACE FUNCTION verify_otp_and_reset_password(
  user_email TEXT,
  otp_code_input VARCHAR(6),
  new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_uuid UUID;
  otp_record RECORD;
BEGIN
  user_uuid := get_user_id_by_email(user_email);
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  SELECT * INTO otp_record
  FROM password_reset_otps
  WHERE user_id = user_uuid
    AND otp_code = otp_code_input
    AND used = FALSE
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF otp_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = user_uuid;
  
  UPDATE password_reset_otps
  SET used = TRUE
  WHERE id = otp_record.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete user account
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM lend_borrow WHERE user_id = user_id_to_delete;
  DELETE FROM budgets WHERE user_id = user_id_to_delete;
  DELETE FROM expenses WHERE user_id = user_id_to_delete;
  DELETE FROM incomes WHERE user_id = user_id_to_delete;
  DELETE FROM profiles WHERE id = user_id_to_delete;
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RAISE NOTICE 'User % and all associated data deleted successfully', user_id_to_delete;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;


-- ============================================
-- PART 3: LEND & BORROW TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS lend_borrow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('lend', 'borrow')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  contact_name VARCHAR(100) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'repaid', 'partial')),
  repaid_amount DECIMAL(12, 2) DEFAULT 0 CHECK (repaid_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lend_borrow_user_id ON lend_borrow(user_id);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_type ON lend_borrow(type);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_status ON lend_borrow(status);
CREATE INDEX IF NOT EXISTS idx_lend_borrow_transaction_date ON lend_borrow(transaction_date);

ALTER TABLE lend_borrow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own lend/borrow entries" ON lend_borrow;
DROP POLICY IF EXISTS "Users can create their own lend/borrow entries" ON lend_borrow;
DROP POLICY IF EXISTS "Users can update their own lend/borrow entries" ON lend_borrow;
DROP POLICY IF EXISTS "Users can delete their own lend/borrow entries" ON lend_borrow;

CREATE POLICY "Users can view their own lend/borrow entries"
ON lend_borrow FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lend/borrow entries"
ON lend_borrow FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own lend/borrow entries"
ON lend_borrow FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lend/borrow entries"
ON lend_borrow FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- PART 4: FRIENDS & TRANSACTIONS SYSTEM
-- ============================================

-- Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- Create friend_invitations table
CREATE TABLE IF NOT EXISTS public.friend_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create pending_transactions table
CREATE TABLE IF NOT EXISTS public.pending_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'lend', 'borrow', 'gift', 'split_bill')),
  from_user_accepted BOOLEAN DEFAULT FALSE,
  to_user_accepted BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create transaction_history table
CREATE TABLE IF NOT EXISTS public.transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pending_transaction_id UUID REFERENCES public.pending_transactions(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  transaction_type VARCHAR(20) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friends table
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friends;
CREATE POLICY "Users can view their own friendships"
ON public.friends FOR SELECT
USING (user_id = auth.uid() OR friend_id = auth.uid());

DROP POLICY IF EXISTS "Users can create friend requests" ON public.friends;
CREATE POLICY "Users can create friend requests"
ON public.friends FOR INSERT
WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their friend requests" ON public.friends;
CREATE POLICY "Users can update their friend requests"
ON public.friends FOR UPDATE
USING (user_id = auth.uid() OR friend_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friends;
CREATE POLICY "Users can delete their friendships"
ON public.friends FOR DELETE
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- RLS Policies for friend_invitations table
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.friend_invitations;
CREATE POLICY "Users can view their own invitations"
ON public.friend_invitations FOR SELECT
USING (inviter_id = auth.uid());

DROP POLICY IF EXISTS "Users can create invitations" ON public.friend_invitations;
CREATE POLICY "Users can create invitations"
ON public.friend_invitations FOR INSERT
WITH CHECK (inviter_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their invitations" ON public.friend_invitations;
CREATE POLICY "Users can delete their invitations"
ON public.friend_invitations FOR DELETE
USING (inviter_id = auth.uid());

-- RLS Policies for pending_transactions table
DROP POLICY IF EXISTS "Users can view their own pending transactions" ON public.pending_transactions;
CREATE POLICY "Users can view their own pending transactions"
ON public.pending_transactions FOR SELECT
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create pending transactions" ON public.pending_transactions;
CREATE POLICY "Users can create pending transactions"
ON public.pending_transactions FOR INSERT
WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their pending transactions" ON public.pending_transactions;
CREATE POLICY "Users can update their pending transactions"
ON public.pending_transactions FOR UPDATE
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their pending transactions" ON public.pending_transactions;
CREATE POLICY "Users can delete their pending transactions"
ON public.pending_transactions FOR DELETE
USING (from_user_id = auth.uid());

-- RLS Policies for transaction_history table
DROP POLICY IF EXISTS "Users can view their transaction history" ON public.transaction_history;
CREATE POLICY "Users can view their transaction history"
ON public.transaction_history FOR SELECT
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert transaction history" ON public.transaction_history;
CREATE POLICY "System can insert transaction history"
ON public.transaction_history FOR INSERT
WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Create indexes for friends system
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);
CREATE INDEX IF NOT EXISTS idx_friend_invitations_token ON public.friend_invitations(token);
CREATE INDEX IF NOT EXISTS idx_friend_invitations_inviter ON public.friend_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_users ON public.pending_transactions(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_transactions_status ON public.pending_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transaction_history_users ON public.transaction_history(from_user_id, to_user_id);

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to accept pending transaction
CREATE OR REPLACE FUNCTION accept_pending_transaction(transaction_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  transaction RECORD;
BEGIN
  SELECT * INTO transaction FROM pending_transactions WHERE id = transaction_id;
  
  IF transaction.from_user_id = user_id THEN
    UPDATE pending_transactions SET from_user_accepted = TRUE WHERE id = transaction_id;
  ELSIF transaction.to_user_id = user_id THEN
    UPDATE pending_transactions SET to_user_accepted = TRUE WHERE id = transaction_id;
  END IF;
  
  -- Check if both users accepted
  SELECT * INTO transaction FROM pending_transactions WHERE id = transaction_id;
  IF transaction.from_user_accepted AND transaction.to_user_accepted THEN
    UPDATE pending_transactions SET status = 'completed' WHERE id = transaction_id;
    INSERT INTO transaction_history (pending_transaction_id, from_user_id, to_user_id, amount, description, transaction_type)
    VALUES (transaction_id, transaction.from_user_id, transaction.to_user_id, transaction.amount, transaction.description, transaction.transaction_type);
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- PART 5: FRIEND CODES SYSTEM
-- ============================================

-- Note: generate_friend_code() function already created above for use in handle_new_user trigger

-- Generate codes for existing users who don't have one
UPDATE profiles 
SET friend_code = generate_friend_code() 
WHERE friend_code IS NULL;

-- Add method column to friends table to track how friendship was created
ALTER TABLE public.friends 
ADD COLUMN IF NOT EXISTS method VARCHAR(20) DEFAULT 'invitation';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_friend_code ON public.profiles(friend_code);
CREATE INDEX IF NOT EXISTS idx_friends_method ON public.friends(method);

-- Comments
COMMENT ON COLUMN profiles.friend_code IS 'Unique alphanumeric code starting with #TRAC- (e.g., #TRAC-A1B2C3D4) that users can share to add friends';
COMMENT ON COLUMN friends.method IS 'Method used to create friendship: invitation, friend_code, or qr_code';


-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- 
-- Core financial tables (categories, incomes, expenses, budgets, accounts)
-- Password reset with OTP system
-- User account deletion function
-- Lend & Borrow tracking with RLS
-- Categories can be favorited
-- Incomes/Expenses can be favorited and marked as recurring
-- Friends system with invitations and QR codes
-- Pending transactions requiring dual approval
-- Friend codes starting with #TRAC- for easy sharing
-- Full RLS policies for data security
-- ============================================
