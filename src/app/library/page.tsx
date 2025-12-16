import { LibraryClient } from "./LibraryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LibraryPage() {
  return <LibraryClient />;
}
