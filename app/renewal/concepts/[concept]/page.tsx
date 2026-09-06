import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absUrl } from "@/data/renewal/site";
import { renewalRobots } from "../../flags";
import { CONCEPTS } from "@/components/renewal/concepts/concepts";
import ConceptHero from "@/components/renewal/concepts/ConceptHero";
import { ConceptNavigation, ConceptReview } from "@/components/renewal/concepts/ConceptReview";
import s from "@/components/renewal/concepts/concepts.module.css";
import { BOLD_CONCEPTS } from "@/components/renewal/concepts/bold-concepts";
import BoldHero from "@/components/renewal/concepts/BoldHero";
import StudyFont from "@/components/renewal/concepts/StudyFont";

export const dynamicParams = false;
export function generateStaticParams() { return [...CONCEPTS, ...BOLD_CONCEPTS].map(({ slug }) => ({ concept: slug })); }

type Props = { params: Promise<{ concept: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { concept: slug } = await params;
    const concept = [...CONCEPTS, ...BOLD_CONCEPTS].find(item => item.slug === slug);
    if (!concept) notFound();
    return { title: `${concept.letter} — ${concept.name}`, alternates: { canonical: absUrl(`/concepts/${concept.slug}`) }, robots: renewalRobots() };
}

export default async function ConceptPage({ params }: Props) {
    const { concept: slug } = await params;
    const bold = BOLD_CONCEPTS.find(item => item.slug === slug);
    if (bold) return <><StudyFont /><BoldHero slug={bold.slug} /></>;
    const concept = CONCEPTS.find(item => item.slug === slug);
    if (!concept) notFound();
    return <div className={s.reviewPage}><ConceptNavigation current={concept.slug} /><ConceptHero concept={concept.slug} /><ConceptReview concept={concept} /></div>;
}
