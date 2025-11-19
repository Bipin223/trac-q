# Supabase Database Setup Instructions

This guide explains how to set up the database tables and functions for the Trac-Q application.

## Files to Run (in order):

### 1. **supabase_lend_borrow_table.sql** (NEW - REQUIRED)
   - Creates the `lend_borrow` table for tracking money lent and borrowed
   - Sets up Row Level Security (RLS) policies
   - Creates indexes for performance
   - **Status**: ✅ Must be run in Supabase SQL Editor

### 2. **supabase_delete_user_function.sql** (NEW - REQUIRED)
   - Creates function to delete user account and all associated data
   - Allows users to permanently delete their accounts from the Profile page
   - **Status**: ✅ Must be run in Supabase SQL Editor

### 3. **COMPLETE_SETUP.sql** (Already exists)
   - Password reset OTP table
   - User lookup functions
   - **Status**: ⚠️ Run if not already done

## How to Run SQL Files:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Copy the contents of each SQL file
5. Paste into the editor
6. Click **"Run"** (or press Ctrl+Enter)
7. Verify no errors appear

## What Each Table Does:

### `lend_borrow` Table
Stores records of money you've lent to others or borrowed from others.

**Columns**:
- `id` - Unique identifier
- `user_id` - Owner of the record
- `type` - Either 'lend' or 'borrow'
- `amount` - Amount in NPR
- `description` - Optional note
- `contact_name` - Person's name
- `transaction_date` - When the transaction occurred
- `due_date` - When repayment is due (optional)
- `status` - 'pending', 'repaid', or 'partial'
- `repaid_amount` - How much has been repaid

### Delete User Function
Allows users to delete their account including:
- All incomes
- All expenses
- All budgets
- All lend/borrow records
- Profile data
- Auth account

## Features Now Available:

### 1. **Lend & Borrow Page**
   - ✅ Two separate tabs: "Lent" and "Borrowed"
   - ✅ Visual summary cards with progress bars
   - ✅ Shows total, pending, and repaid amounts
   - ✅ Percentage completion indicators
   - ✅ Add new lend/borrow transactions
   - ✅ View all transactions in sortable tables

### 2. **Profile Page - Delete Account**
   - ✅ "Danger Zone" section added
   - ✅ Delete account button with confirmation
   - ✅ Removes ALL user data permanently
   - ✅ Signs out and redirects to login

## Verification:

After running the SQL files, verify the setup:

```sql
-- Check if lend_borrow table exists
SELECT * FROM lend_borrow LIMIT 1;

-- Check if delete function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'delete_user_account';
```

## Notes:

- ⚠️ **Delete Account is PERMANENT** - All data will be lost
- 🔒 RLS policies ensure users can only see/modify their own data
- 📊 Visual charts automatically calculate from your data
- 🔄 Data refreshes automatically after adding new entries

## Support:

If you encounter errors:
1. Check the Supabase SQL Editor for error messages
2. Verify you're logged in with proper permissions
3. Ensure no duplicate tables/functions exist
4. Try dropping and recreating if needed

---

**All SQL files are ready to use!** Just copy-paste and run them in Supabase SQL Editor.
