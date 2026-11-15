import { GoogleFont, ImageResponse, cache } from '@cf-wasm/og/workerd';
import { createApp } from '../app';
import { OgQuery } from '../lib/schemas';

function OgCard({ title, count }: { title: string; count: number }) {
  const label = `${count} track${count === 1 ? '' : 's'} · Guess each song from a 1-second clip`;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0f',
        padding: '72px 80px',
        fontFamily: 'Inter',
      }}
    >
      <p
        style={{
          color: '#6b7280',
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          margin: '0 0 20px',
        }}
      >
        oneshot
      </p>
      <h1
        style={{
          color: '#f8fafc',
          fontSize: title.length > 40 ? 56 : 72,
          fontWeight: 700,
          lineHeight: 1.1,
          margin: '0 0 28px',
        }}
      >
        {title}
      </h1>
      <p style={{ color: '#9ca3af', fontSize: 30, margin: 0 }}>{label}</p>
    </div>
  );
}

const SIZE = { width: 1200, height: 630 };

/** GET /api/og?title=&count= — 1200×630 PNG share card, edge-cached by URL. */
export const og = createApp().get('/', async (c) => {
  const parsed = OgQuery.safeParse(c.req.query());
  const title = (parsed.success && parsed.data.title) || 'A oneshot game';
  const count = (parsed.success && parsed.data.count) || 0;

  const edgeCache = caches.default;
  const cacheKey = new Request(c.req.url, { method: 'GET' });
  const hit = await edgeCache.match(cacheKey);
  if (hit) return hit;

  cache.setExecutionContext(c.executionCtx);
  const element = <OgCard title={title} count={count} />;

  let image: Response;
  try {
    image = await ImageResponse.async(element, {
      ...SIZE,
      fonts: [600, 700].map((weight) => new GoogleFont('Inter', { weight: weight as 600 | 700 })),
      defaultFont: new GoogleFont('Inter', { weight: 400 }),
    });
  } catch (err) {
    // Google Fonts unreachable: fall back to the bundled default font.
    console.warn('og: Inter unavailable, using bundled font', err);
    image = await ImageResponse.async(element, SIZE);
  }

  const res = new Response(image.body, image);
  res.headers.set('Content-Type', 'image/png');
  res.headers.set('Cache-Control', 'public, max-age=86400, immutable');
  c.executionCtx.waitUntil(edgeCache.put(cacheKey, res.clone()));
  return res;
});
