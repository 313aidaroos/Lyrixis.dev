import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_CATEGORIES = ['bug', 'feature_request', 'billing', 'general'];

export async function POST(request: NextRequest) {
  try {
    const { email, subject, message, category } = await request.json();

    // Validation
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (!message || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category || 'general')) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Create support ticket
    const { data: ticket, error } = await admin
      .from('support_tickets')
      .insert({
        user_email: email,
        subject: subject || 'General inquiry',
        message,
        category: category || 'general',
        status: 'open',
        routed_to: 'awad@apixis.dev',
      })
      .select('id, created_at')
      .single();

    if (error || !ticket) {
      console.error('Support ticket creation failed:', error);
      return NextResponse.json(
        { error: 'Failed to create support ticket' },
        { status: 500 }
      );
    }

    // Send confirmation email to user and notification to Awad
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Send confirmation to user
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Lyrixis <lyrixis@apixis.dev>',
        to: email,
        subject: 'We received your support request',
        text: `Hi,\n\nWe received your support request (Ticket ${ticket.id}).\n\nYour message:\n${message}\n\nAwad will review it shortly.\n\n— Lyrixis Team`,
      });

      // Send notification to Awad
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Lyrixis <lyrixis@apixis.dev>',
        to: 'awad@apixis.dev',
        subject: `Lyrixis Support: ${subject || 'General inquiry'}`,
        text: `New support ticket ${ticket.id}\n\nFrom: ${email}\nCategory: ${category || 'general'}\nSubject: ${subject || 'General inquiry'}\n\nMessage:\n${message}\n\nView: https://lyrixis.apixis.dev/admin/support/${ticket.id}`,
      });
    } catch (emailError) {
      console.error('Email send failed:', emailError);
      // Don't fail the request if email fails - ticket is already saved
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: 'We received your support request. Awad will review it shortly.',
      confirmationEmail: `sent to ${email}`,
    });
  } catch (error) {
    console.error('Support intake error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
