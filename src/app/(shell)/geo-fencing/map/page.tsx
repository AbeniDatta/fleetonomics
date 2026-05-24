import { redirect } from "next/navigation";

export default function GeoFencingMapRedirectPage() {
  redirect("/geo-fencing#live-fleet-map");
}
