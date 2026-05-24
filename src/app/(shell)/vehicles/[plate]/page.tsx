import { VehicleDetail } from "@/components/vehicles/vehicle-detail";

type Props = { params: Promise<{ plate: string }> };

export default async function VehicleDetailPage({ params }: Props) {
  const { plate } = await params;
  return (
    <div>
      <VehicleDetail plate={decodeURIComponent(plate)} />
    </div>
  );
}
