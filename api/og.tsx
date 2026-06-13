import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler(request: Request): ImageResponse {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') ?? 'A oneshot game';
  const count = Number(searchParams.get('count') ?? '0');
  const label = `${count} track${count === 1 ? '' : 's'} · Guess each song from a 1-second clip`;

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0f',
        padding: '72px 80px',
        fontFamily: 'system-ui, sans-serif',
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
    </div>,
    { width: 1200, height: 630 },
  );
}
