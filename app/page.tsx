import { loadTempEmailSelectionConfig } from "@/lib/server/config";
import { SemiAutoWorkbench } from "@/components/semi-auto-workbench";

export default function HomePage() {
  const { tempEmailAddresses } = loadTempEmailSelectionConfig();

  return <SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />;
}
