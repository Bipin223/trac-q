import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  email: string
  type: 'otp' | 'recovery'
  otp?: string
  username?: string
  redirectTo?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, type, otp, username, redirectTo }: EmailRequest = await req.json()

    if (!email || !type) {
      return new Response(
        JSON.stringify({ error: 'Email and type are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL ?? '',
      SUPABASE_SERVICE_ROLE_KEY ?? ''
    )

    let htmlContent = ''
    let subjectLine = ''

    if (type === 'recovery') {
      // Generate a secure recovery link that bypasses domain issues
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: { redirectTo: redirectTo || `${new URL(req.url).origin}/reset-password` }
      })

      if (linkError) throw linkError

      const actionLink = linkData.properties.action_link
      subjectLine = '🔒 Reset Your Trac-Q Password'

      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 10px;">
                  <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
                    <!-- Premium Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); padding: 60px 40px; text-align: center;">
                        <img src="https://fgyoexlosyvvgumpzgwe.supabase.co/storage/v1/object/public/logos/logo.png" alt="Trac-Q Logo" style="width: 80px; height: 80px; margin-bottom: 24px;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -0.025em;">Secure Reset</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 48px 40px;">
                        <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 24px; font-weight: 700;">Hello there!</h2>
                        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569;">
                          We received a request to access your Trac-Q account. To ensure your security, please click the button below to set a new password.
                        </p>
                        
                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; margin: 32px 0;">
                          <tr>
                            <td align="center">
                              <a href="${actionLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: #ffffff; padding: 18px 36px; border-radius: 14px; text-decoration: none; font-size: 18px; font-weight: 600; box-shadow: 0 10px 15px -3px rgba(124, 58, 237, 0.3);">
                                Reset My Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #64748b; text-align: center;">
                          If you didn't request this, you can safely ignore this email. This link will expire in 24 hours.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer Info -->
                    <tr>
                      <td style="padding: 0 40px 48px;">
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 32px; text-align: center;">
                          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">The Trac-Q Team</p>
                          <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">Automated message, please do not reply.</p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    } else {
      // Original OTP Fallback
      subjectLine = 'Password Reset OTP - Trac-Q'
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
          <h2>Your OTP Code</h2>
          <p>Please use the following code to reset your password:</p>
          <div style="background: #f3f4f6; padding: 20px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px;">
            ${otp}
          </div>
        </div>
      `
    }

    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Trac-Q <noreply@tracq.app>',
        to: [email],
        subject: subjectLine,
        html: htmlContent,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return new Response(
        JSON.stringify({ success: true, data }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      const errorText = await res.text()
      console.error('Resend API error:', errorText)
      throw new Error(`Failed to send email: ${errorText}`)
    }
  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
