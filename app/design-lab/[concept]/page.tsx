import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absUrl } from "@/data/renewal/site";
import { renewalRobots } from "@/app/renewal/flags";
import { DIRECTIONS } from "@/components/renewal/concepts/round-three/directions";
import { StudyHeader, StudyDock, DirectionNotes } from "@/components/renewal/concepts/round-three/ReviewChrome";
import SceneStage from "@/components/renewal/concepts/round-three/SceneStage";
import TypeHero from "@/components/renewal/concepts/round-three/TypeHero";
import SpaceHero from "@/components/renewal/concepts/round-three/SpaceHero";
import EditionHero from "@/components/renewal/concepts/round-three/EditionHero";

type Props = { params: Promise<{ concept: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return DIRECTIONS.map(item => ({concept: item.slug})); }
export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {concept} = await params;
    const direction = DIRECTIONS.find(item => item.slug === concept);
    if (!direction) notFound();
    return { title: `${direction.letter}. ${direction.name}`, alternates: {canonical: absUrl(`/design-lab/${direction.slug}`)}, robots: renewalRobots() };
}
export default async function DirectionPage({params}: Props) {
    const {concept} = await params;
    const direction = DIRECTIONS.find(item => item.slug === concept);
    if (!direction) notFound();
    return <><StudyHeader current={direction.slug} /><main><SceneStage key={direction.slug}>{direction.slug === "type" ? <TypeHero /> : direction.slug === "space" ? <SpaceHero /> : <EditionHero />}</SceneStage><DirectionNotes current={direction.slug} /></main><StudyDock current={direction.slug} /></>;
}
