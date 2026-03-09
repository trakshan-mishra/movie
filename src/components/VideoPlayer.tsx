import React from 'react';
import { Play } from 'lucide-react';

interface Props {
  videos: Array<{
    key: string;
    site: string;
    type: string;
    name: string;
  }>;
}

export default function VideoPlayer({ videos }: Props) {
  const trailer = videos?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  if (!trailer) return null;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Play size={16} /> Trailer
      </h2>
      <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${trailer.key}?rel=0`}
          title={trailer.name}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}