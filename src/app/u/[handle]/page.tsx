"use client";

import { ProfileScreen } from "@/components/ProfileScreen";
import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams<{ handle: string }>();
  return <ProfileScreen handle={params.handle} />;
}
