# 🚀 Quick Start - Forgot Password Setup

## ⚡ 3-Minute Setup

### 1️⃣ Run SQL Script (1 minute)
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** → **New Query**
3. Copy and paste **COMPLETE_SETUP.sql**
4. Click **Run**

✅ This creates:
- OTP table for storing verification codes
- Function to get user by email
- Function to update passwords

---

### 2️⃣ Deploy Edge Function (1 minute)
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link your project (replace YOUR_PROJECT_REF)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-otp-email
```

✅ This deploys the email sending function.

---

### 3️⃣ Configure Email Service (1 minute)

#### Option A: For Testing (Console Logging)
**No setup needed!** OTP will be logged to browser console.

#### Option B: For Production (Real Emails)
1. Sign up at [Resend.com](https://resend.com) (free)
2. Get your API key
3. In Supabase Dashboard:
   - Go to **Project Settings** → **Edge Functions**
   - Add secret: `RESEND_API_KEY` = your_api_key

✅ This enables real email sending.

---

## 🎯 Test It Now!

1. Go to `/forgot-password` in your app
2. Enter your email: `bipinrjl24@gmail.com`
3. See account info displayed:
   - ✅ Username: bipinrjl24
   - ✅ Email: bi****@gmail.com
4. Check console (F12) for OTP code
5. Enter the 6-digit code
6. Set new password
7. Login with new password

---

## 📁 Files Created

- ✅ `supabase/functions/send-otp-email/index.ts` - Email function
- ✅ `COMPLETE_SETUP.sql` - All SQL commands
- ✅ `FORGOT_PASSWORD_SETUP.md` - Detailed guide
- ✅ Updated `src/pages/ForgotPassword.tsx` - UI improvements

---

## 🎨 What's New?

### Before:
- ❌ No account verification
- ❌ No email sending
- ❌ No username display

### After:
- ✅ Shows username and email when account found
- ✅ Sends beautiful HTML emails with OTP
- ✅ Displays account info in green card
- ✅ Professional email template
- ✅ Fallback to console logging for development

---

## 🔥 Features

1. **Account Verification**
   - Shows username and masked email
   - Green confirmation card

2. **Email OTP**
   - Beautiful HTML template
   - 6-digit code
   - 10-minute expiration
   - Resend option

3. **Security**
   - One-time use codes
   - Automatic expiration
   - Secure password update

4. **User Experience**
   - 3-step clear process
   - Visual feedback
   - Error handling
   - Loading states

---

## 🆘 Quick Troubleshooting

**"Failed to generate OTP"**
→ Run COMPLETE_SETUP.sql in Supabase

**"Failed to update password"**
→ Make sure SQL script ran successfully

**"Email not sending"**
→ Check if RESEND_API_KEY is set (or check console for OTP)

**"No account found"**
→ Make sure the email exists in your database

---

## 📞 Need Help?

Check **FORGOT_PASSWORD_SETUP.md** for detailed instructions and troubleshooting.

---

## ✨ That's It!

Your forgot password system is now fully functional with email verification and account display! 🎉
