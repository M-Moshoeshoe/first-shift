import type { Metadata } from "next";
import { Band } from "@/components/ui/Band";
import { PageTitle } from "@/components/ui/PageTitle";
import { PostTryout } from "./_components/PostTryout";

export const metadata: Metadata = { title: "Post a tryout on First Shift" };

export default function PostTryoutPage() {
  return (
    <Band tone="paper">
      <PageTitle title="Post a tryout" intro="A tryout is one paid day for a young person to show what they can do. Describe what you need, and we'll draft it for you." />
      <PostTryout />
    </Band>
  );
}
