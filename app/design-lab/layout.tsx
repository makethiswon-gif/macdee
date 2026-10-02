import StudyFont from "@/components/renewal/concepts/StudyFont";
import s from "@/components/renewal/concepts/round-three/review.module.css";

export default function DesignLabLayout({ children }: { children: React.ReactNode }) {
    return <div className={s.root}><StudyFont />{children}</div>;
}
