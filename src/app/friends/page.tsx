import { Suspense } from "react";
import { FriendsScreen } from "@/components/FriendsScreen";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-8 text-sm text-black/45">
          Loading…
        </div>
      }
    >
      <FriendsScreen />
    </Suspense>
  );
}
