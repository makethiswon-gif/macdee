import { cookies } from "next/headers";
import { isIdeaAuthed } from "@/lib/oyk-idea/server";
import IdeaBoard from "./IdeaBoard";
import IdeaLogin from "./IdeaLogin";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ add?: string; t?: string }> };

export default async function IdeaPage({ searchParams }: Props) {
    const jar = await cookies();
    if (!isIdeaAuthed((name) => jar.get(name)?.value)) return <IdeaLogin />;
    const { add, t } = await searchParams;
    // 북마클릿: /idea?add=<보던 페이지 주소>&t=<페이지 제목> 으로 열리면 담기 창을 바로 띄운다.
    const capture = add && /^https?:\/\//i.test(add) ? { url: add.slice(0, 2000), title: (t || "").slice(0, 200) } : null;
    return <IdeaBoard capture={capture} />;
}
