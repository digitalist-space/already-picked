import { permanentRedirect } from "next/navigation";

export default async function ThemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/${slug}`);
}
