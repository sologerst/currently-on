"use client";

import { ListScreen } from "@/components/ListScreen";
import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams<{ handle: string; slug: string }>();
  return <ListScreen handle={params.handle} slug={params.slug} />;
}
