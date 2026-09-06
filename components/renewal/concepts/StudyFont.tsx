import { preload } from "react-dom";
import fonts from "./study-font-preload.json";
import "./study-font.css";
export default function StudyFont() {
    for (const href of fonts) preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
    return null;
}
