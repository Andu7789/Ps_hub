import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type PublicSite = {
  business: {
    name: string;
    slug: string;
    tagline: string | null;
    about: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    brand_color: string;
    logo_url: string | null;
  };
  services: { id: string; name: string; description: string | null; price: string | null; duration: string | null }[];
  reviews: { name: string; rating: number; comment: string | null; submitted_at: string }[];
  jobs: boolean;
  privacy_notice_id: string | null;
};

// A published business site, or null (not found, unpublished, or the
// Website module is off). Read through hub_public_site, never the tables.
export const getPublicSite = cache(async (slug: string): Promise<PublicSite | null> => {
  if (!/^[a-z0-9-]{1,50}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("hub_public_site", { business_slug: slug });
  return (data as PublicSite | null) ?? null;
});

export type PublicJobs = {
  business: { name: string; slug: string; brand_color: string; logo_url: string | null };
  vacancies: {
    id: string;
    title: string;
    location: string | null;
    hours: string | null;
    pay: string | null;
    description: string | null;
    closing_on: string | null;
  }[];
};

export const getPublicJobs = cache(async (slug: string): Promise<PublicJobs | null> => {
  if (!/^[a-z0-9-]{1,50}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("hub_public_jobs", { business_slug: slug });
  return (data as PublicJobs | null) ?? null;
});
