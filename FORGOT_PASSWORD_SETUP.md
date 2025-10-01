# Forgot Password Setup Guide

## 🎯 Overview

Your Trac-Q application now has a complete **OTP-based password reset system** with email verification. Here's how it works:

### User Flow:
1. **User enters email** → System finds account and displays username
2. **System generates 6-digit OTP** → Stores in database
3. **OTP sent to user's email** → Beautiful HTML email with OTP code
4. **User enters OTP** → System verifies code
5. **User sets new password** → Password updated in database
6. **User can login** → With new password

---

## 🔧 Setup Instructions

### Step 1: Create Database Table for OTPs

1. Go to your **Supabase Dashboard**
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase_otp_table.sql`
5. Click **Run** to create the table

### Step 2: Create Password Update Function

1. In the **SQL Editor**, create another **New Query**
2. Copy and paste the contents of `supabase_password_reset_function.sql`
3. Click **Run** to create the function

This function allows the system to update user passwords without requiring authentication.

### Step 3: Deploy the Email Sending Edge Function

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Deploy the edge function:
   ```bash
   supabase functions deploy send-otp-email
   ```

### Step 4: Configure Resend API Key

1. Sign up for a free account at [Resend.com](https://resend.com)
2. Get your API key from the dashboard
3. In your Supabase Dashboard, go to **Project Settings** → **Edge Functions**
4. Add a new secret:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key

### Step 5: Configure Email Domain (Optional)

In `supabase/functions/send-otp-email/index.ts`, update the `from` field:
```typescript
from: 'Trac-Q <noreply@yourdomain.com>',
```

For testing, you can use Resend's test domain: `onboarding@resend.dev`

---

## 🎨 Features

### Security Features:
- ✅ **6-digit OTP code** (100,000 - 999,999)
- ✅ **10-minute expiration** (configurable)
- ✅ **One-time use** (marked as used after verification)
- ✅ **Resend OTP** option available
- ✅ **Email masking** (shows: bi****@gmail.com)
- ✅ **Account verification** (shows username and email)

### User Experience:
- ✅ **3-step process** with clear instructions
- ✅ **Account found confirmation** with username and email
- ✅ **Beautiful email template** with gradient design
- ✅ **Large OTP input** (easy to read)
- ✅ **Auto-format** (only accepts numbers)
- ✅ **Expiration timer** shown to user
- ✅ **Resend button** if code expires
- ✅ **Success/error messages** at each step

---

## 📧 Email Template

The OTP email includes:
- **Professional design** with gradient header
- **Large, readable OTP code** in monospace font
- **Security warning** about not sharing the code
- **Expiration notice** (10 minutes)
- **Personalized greeting** with username
- **Responsive design** for mobile devices

---

## 🧪 Testing the Flow

### Development Testing (Without Email Service):

1. **Go to Forgot Password page**
   - Navigate to `/forgot-password`

2. **Enter email**
   - Example: `bipinrjl24@gmail.com`
   - Click "Send OTP Code"

3. **Check console for OTP**
   - Open browser console (F12)
   - Look for: `OTP for bipinrjl24@gmail.com: 123456`

4. **Verify account info**
   - You should see a green card showing:
     - Username: bipinrjl24
     - Email: bi****@gmail.com

5. **Enter the 6-digit code**
   - Type the code in the large input field
   - Click "Verify OTP"

6. **Set new password**
   - Enter new password (min 6 characters)
   - Confirm password
   - Click "Reset Password"

7. **Login with new password**
   - Redirected to login page
   - Use new password to sign in

### Production Testing (With Email Service):

Once you've set up Resend:
1. Follow steps 1-2 above
2. Check your actual email inbox for the OTP
3. Continue with steps 4-7

---

## 🔍 Troubleshooting

### Issue: "Failed to generate OTP"
**Solution:** Make sure you ran the SQL script `supabase_otp_table.sql` to create the `password_reset_otps` table.

### Issue: "Invalid OTP code"
**Possible causes:**
- Wrong code entered
- Code expired (10 minutes)
- Code already used

**Solution:** Click "Resend OTP" to get a new code.

### Issue: "No account found"
**Solution:** Make sure the email exists in the database and is associated with a user account.

### Issue: "Failed to update password"
**Solution:** Make sure you ran the SQL script `supabase_password_reset_function.sql` to create the password update function.

### Issue: Email not sending
**Possible causes:**
- Edge function not deployed
- RESEND_API_KEY not set
- Invalid API key

**Solution:** 
1. Check edge function deployment: `supabase functions list`
2. Verify API key in Supabase dashboard
3. Check edge function logs: `supabase functions logs send-otp-email`

### Issue: OTP not showing in console
**Solution:** 
1. Open browser console (F12)
2. Check "Console" tab
3. Look for log message starting with "OTP for"
4. This is the fallback when email service is not configured

---

## 🚀 Production Checklist

Before going to production:

- [ ] Database table created (`password_reset_otps`)
- [ ] Password update function created (`update_user_password`)
- [ ] Edge function deployed (`send-otp-email`)
- [ ] Resend API key configured
- [ ] Email domain configured (or using Resend test domain)
- [ ] Test complete flow with real email
- [ ] Verify OTP expiration works
- [ ] Test "Resend OTP" functionality
- [ ] Test with invalid credentials
- [ ] Test password strength validation

---

## 📊 Database Schema

### password_reset_otps table:
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- otp_code: VARCHAR(6)
- expires_at: TIMESTAMP
- used: BOOLEAN
- created_at: TIMESTAMP
```

### Indexes:
- `idx_password_reset_otps_user_id`
- `idx_password_reset_otps_otp_code`
- `idx_password_reset_otps_expires_at`

---

## 🎉 You're All Set!

Your OTP-based password reset is now fully functional with:
- ✅ Email verification
- ✅ Account display (username + email)
- ✅ Beautiful email templates
- ✅ Secure OTP generation and validation
- ✅ Password update functionality
- ✅ User-friendly interface

The system is production-ready once you complete the setup steps above!

---

## 💡 Optional Enhancements

1. **Rate Limiting**
   - Limit OTP requests per user (e.g., 3 per hour)
   - Prevent spam/abuse

2. **SMS OTP** (Alternative)
   - Integrate Twilio for SMS
   - Send OTP via text message

3. **Analytics**
   - Track OTP success rate
   - Monitor failed attempts

4. **Custom Email Templates**
   - Add your logo
   - Customize colors and branding
   - Add social media links

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review Supabase logs in the dashboard
3. Check browser console for errors
4. Verify all setup steps were completed

Happy coding! 🚀
