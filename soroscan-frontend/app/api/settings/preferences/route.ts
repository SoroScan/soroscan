import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({ ok: true, data: body });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
