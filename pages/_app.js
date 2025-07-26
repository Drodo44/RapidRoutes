import '../styles/globals.css';
import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const publicRoutes = ['/login', '/signup'];
    if (!user && !publicRoutes.includes(router.pathname)) {
      router.push('/login');
    }
  }, [user, router.pathname]);

  return <Component {...pageProps} user={user} />;
}

export default MyApp;
