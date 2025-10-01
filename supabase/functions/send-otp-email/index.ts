import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  email: string
  otp: string
  username?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, otp, username }: EmailRequest = await req.json()

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: 'Email and OTP are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
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
        subject: 'Password Reset OTP - Trac-Q',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Password Reset OTP</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Trac-Q</h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
                          
                          ${username ? `<p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.5;">Hello <strong>${username}</strong>,</p>` : ''}
                          
                          <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.5;">
                            We received a request to reset your password. Use the following One-Time Password (OTP) to complete the process:
                          </p>
                          
                          <!-- OTP Box -->
                          <table role="presentation" style="width: 100%; margin: 30px 0;">
                            <tr>
                              <td align="center">
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; display: inline-block;">
                                  <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
                                  <p style="margin: 10px 0 0; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                                </div>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.5;">
                            This code will expire in <strong>10 minutes</strong>. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                          </p>
                          
                          <!-- Security Notice -->
                          <table role="presentation" style="width: 100%; margin: 20px 0; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                            <tr>
                              <td style="padding: 16px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                  <strong>⚠️ Security Tip:</strong> Never share this code with anyone. Trac-Q will never ask for your OTP via phone or email.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                            Best regards,<br>
                            <strong>The Trac-Q Team</strong>
                          </p>
                          <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                            This is an automated message, please do not reply to this email.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Footer Text -->
                    <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © 2025 Trac-Q. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
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
      const error = await res.text()
      console.error('Resend API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
