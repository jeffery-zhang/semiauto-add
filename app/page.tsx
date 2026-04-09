import { connection } from "next/server";
import { loadTempEmailSelectionConfig } from "@/lib/server/config";
import { SemiAutoWorkbench } from "@/components/semi-auto-workbench";

export default async function HomePage() {
  await connection();

  const { tempEmailAddresses } = loadTempEmailSelectionConfig();

  return <SemiAutoWorkbench tempEmailAddresses={tempEmailAddresses} />;
}
