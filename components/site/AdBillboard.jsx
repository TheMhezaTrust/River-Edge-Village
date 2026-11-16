import { getActiveAds } from "@/lib/public-ads";
import AdRotator from "@/components/site/AdRotator";

// Slim advertising banner between the page content and the site footer. Mounted
// only by the (site) layout, so the member portal and the workstation never show
// it, and it renders nothing at all while no advertisement is live.
export default async function AdBillboard() {
  const ads = await getActiveAds();
  if (ads.length === 0) return null;
  return <AdRotator ads={ads} />;
}
