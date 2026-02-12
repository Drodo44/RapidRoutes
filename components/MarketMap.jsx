import dynamic from 'next/dynamic';

const MarketMapClient = dynamic(() => import('./MarketMapClient'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '400px', width: '100%', background: '#0f172a', borderRadius: '12px' }} />
    )
});

export default function MarketMap(props) {
    return <MarketMapClient {...props} />;
}
