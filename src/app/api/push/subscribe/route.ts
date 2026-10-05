import { smallJson } from '@/lib/server/request-security';
import { NextResponse } from 'next/server';
import { authenticatedClient } from '@/lib/server/auth';
import { validSubscription, validPushEndpoint } from '@/lib/push-validation';

export const dynamic = 'force-dynamic';

async function handle(request: Request, remove: boolean) {
  try {
    const auth = await authenticatedClient(request);
    if (!auth) return NextResponse.json({ error: 'Giriş tələb olunur.' }, { status: 401 });
    let body: unknown;
    try { body = await smallJson(request); }
    catch { return NextResponse.json({ error: 'Sorğu etibarsızdır və ya çox böyükdür.' }, { status: 400 }); }
    if (remove) {
      const endpoint = body && typeof body === 'object' && 'endpoint' in body ? body.endpoint : null;
      if (!validPushEndpoint(endpoint)) return NextResponse.json({ error: 'Yanlış endpoint.' }, { status: 400 });
      const { error } = await auth.db.from('push_subscriptions').delete().eq('user_id', auth.user.id).eq('endpoint', endpoint);
      if (error) throw error;
    } else {
      if (!validSubscription(body)) return NextResponse.json({ error: 'Abunəlik etibarsızdır.' }, { status: 400 });
      const { error } = await auth.db.from('push_subscriptions').upsert({
        user_id: auth.user.id, endpoint: body.endpoint,
        subscription: { endpoint: body.endpoint, keys: body.keys },
      }, { onConflict: 'endpoint' });
      if (error) return NextResponse.json({ error: 'Abunəlik saxlanmadı. Cihaz limitini yoxlayın və yenidən cəhd edin.' }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Əməliyyat tamamlanmadı.' }, { status: 500 });
  }
}
export async function POST(request: Request) { return handle(request, false); }
export async function DELETE(request: Request) { return handle(request, true); }
