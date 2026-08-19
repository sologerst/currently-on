"use client";

import { JoinScreen } from "@/components/JoinScreen";
import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams<{ code: string }>();
  return <JoinScreen code={params.code} />;
}
