import { ImageResponse } from 'next/og'

// Icône de l'application (utilisée pour les favicons et PWA)
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '20%',
          fontWeight: 'bold',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        L
      </div>
    ),
    {
      ...size,
    }
  )
}
