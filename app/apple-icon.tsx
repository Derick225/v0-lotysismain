import { ImageResponse } from 'next/og'

// Icône Apple Touch (utilisée pour iOS)
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '22%',
          fontWeight: 'bold',
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: '80px', marginBottom: '-10px' }}>🎲</div>
          <div style={{ fontSize: '40px', fontWeight: '900' }}>L</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
