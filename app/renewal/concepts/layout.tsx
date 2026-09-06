// Keep the comparison archive independent from the selected design rollout.
export default function ConceptsLayout({ children }: { children: React.ReactNode }) {
    return <div data-renewal-study style={{ display: "contents" }}>{children}</div>;
}
