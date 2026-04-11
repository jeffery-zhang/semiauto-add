import { connection } from "next/server";
import { SemiAutoWorkbench } from "@/components/semi-auto-workbench";

export default async function HomePage() {
  await connection();

  return <SemiAutoWorkbench />;
}
