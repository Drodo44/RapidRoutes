import Image from 'next/image';

const MarketMapClient = ({ imageUrl = null }) => {
  if (!imageUrl) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          minHeight: '400px',
          borderRadius: '12px',
          background: 'radial-gradient(circle at top, rgba(30,41,59,0.75) 0%, rgba(2,6,23,0.9) 75%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#cbd5e1',
          fontSize: '14px',
          fontWeight: 600
        }}
      >
        No data
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        minHeight: '400px',
        borderRadius: '12px',
        background: 'radial-gradient(circle at top, rgba(30,41,59,0.75) 0%, rgba(2,6,23,0.9) 75%)',
        overflow: 'hidden'
      }}
    >
      <Image
        src={imageUrl}
        alt="DAT market heat map"
        fill
        unoptimized
        sizes="100vw"
        style={{
          // Keep DAT as source-of-truth while giving it a better visual fit in our UI.
          // "cover" prevents the tiny/letterboxed look that varies week-to-week.
          objectFit: 'cover',
          // Slight downward bias centers the CONUS heat areas in most DAT uploads.
          objectPosition: 'center 56%',
          transform: 'scale(1.03)',
          filter: 'saturate(1.06) contrast(1.04) drop-shadow(0 14px 30px rgba(2,6,23,0.35))'
        }}
      />
    </div>
  );
};

export default MarketMapClient;
