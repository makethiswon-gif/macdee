import { notFound } from "next/navigation";
import { isCrewToken } from "@/lib/deepmakai/server";
import CrewBoard from "./CrewBoard";

export const dynamic = "force-dynamic";

export default async function CrewPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    if (!isCrewToken(token)) notFound();
    return <CrewBoard token={token} />;
}
