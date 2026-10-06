import StudyFont from "@/components/renewal/concepts/StudyFont";
import { RENEWAL_SEARCH_NOINDEX } from "@/app/renewal/flags";
import s from "@/components/renewal/concepts/round-three/review.module.css";

export default function DesignLabLayout({ children }: { children: React.ReactNode }) {
    return <div className={s.root}>
        {/* Keep the comparison archive out of search using the existing bot-specific policy. */}
        {RENEWAL_SEARCH_NOINDEX && <>
            <meta name="googlebot" content="noindex, nofollow" />
            <meta name="Yeti" content="noindex, nofollow" />
            <meta name="bingbot" content="noindex, nofollow" />
        </>}
        <StudyFont />{children}
    </div>;
}
