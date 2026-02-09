import Head from 'next/head';
import DashboardSidebar from './DashboardSidebar';

export default function DashboardLayout({ children, title = "RapidRoutes", stats }) {
    return (
        <>
            <Head>
                <title>{title}</title>
            </Head>

            <div className="dashboard-container">
                <DashboardSidebar stats={stats} />

                {/* Main Content */}
                <main className="dashboard-main">
                    {children}
                </main>
            </div>
        </>
    );
}
