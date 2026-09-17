type OpenCv = typeof import("@techstark/opencv-js");
let runtime: Promise<{ cv: OpenCv }> | undefined;

export function openCv() {
    if (!runtime) {
        // OpenCV 4 exports a self-resolving thenable; keep it inside a plain wrapper.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const cvModule: OpenCv | Promise<OpenCv> = require("@techstark/opencv-js");
        runtime = (async () => {
            const cv = cvModule instanceof Promise ? await cvModule : cvModule;
            if (!cv.Mat) await new Promise<void>((resolve) => { cv.onRuntimeInitialized = resolve; });
            return { cv };
        })();
    }
    return runtime;
}
