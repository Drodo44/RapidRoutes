// pages/index.js
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export const getServerSideProps = async (ctx) => {
  const supabase = createServerSupabaseClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();
  return {
    redirect: {
      destination: session ? "/dashboard" : "/login",
      permanent: false,
    },
  };
};

export default function IndexRedirect() { return null; }
