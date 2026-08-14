"use client";

import { DetailScreen } from "@/components/DetailScreen";
import type { CategoryKind } from "@/lib/types";
import { useParams } from "next/navigation";

const KINDS: CategoryKind[] = ["music", "tv", "movies", "podcasts", "books"];

export default function Page() {
  const params = useParams<{ kind: string; id: string }>();
  const kind = params.kind as CategoryKind;
  if (!KINDS.includes(kind)) return <p className="p-4">Unknown category.</p>;
  return <DetailScreen kind={kind} id={params.id} />;
}
