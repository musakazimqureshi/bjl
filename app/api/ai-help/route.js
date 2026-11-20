import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export const runtime = 'nodejs';
const hash = value => createHash('sha256').update(value).digest('hex');

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'AI Help Center is not configured yet.' }, { status: 503 });
    }
    const body = await request.json();
    const visitor = String(body.visitor || '');
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!/^[0-9a-f-]{36}$/i.test(visitor) || !messages.length || messages.length > 12) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }
    const cleaned = messages.map(m => ({ role: m.role, content: String(m.content || '').slice(0, 1200) }));
    if (cleaned.some(m => !['user','assistant'].includes(m.role) || !m.content.trim())) {
      return NextResponse.json({ error: 'Invalid message.' }, { status: 400 });
    }
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const visitorKey = hash(visitor + ':' + ip);
    const rpc = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/consume_ai_chat_quota', {
      method: 'POST',
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_visitor_key: visitorKey }),
      cache: 'no-store'
    });
    if (!rpc.ok) throw new Error('Could not check chat allowance.');
    const quota = await rpc.json();
    const allowance = Array.isArray(quota) ? quota[0] : quota;
    if (!allowance?.allowed) return NextResponse.json({ error: 'You have used all 30 messages for this 30-day period. Please try again later.' }, { status: 429 });
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          { role: 'system', content: 'You are the Battagram Junior League (BJL) website help assistant. Answer clearly and politely. Help with team registration, player registration, payment submission, match information, announcements and website navigation. Do not invent schedules, rules, fees, results or team details that are not supplied. If you do not know a current tournament detail, direct the visitor to the official BJL WhatsApp contacts on the page. Reply in the language used by the visitor (Urdu, Roman Urdu, Pashto or English). Never request passwords, OTPs, payment card details or sensitive personal information.' },
          ...cleaned
        ]
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'AI service temporarily unavailable.');
    const reply = result.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('No reply was returned.');
    return NextResponse.json({ reply, remaining: allowance.remaining });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Something went wrong.' }, { status: 500 });
  }
}
