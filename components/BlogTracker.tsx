"use client";

import { useEffect, useRef } from "react";

interface BlogTrackerProps {
    lawyerId: string;
    postId?: string;
    pagePath: string;
}

export default function BlogTracker({ lawyerId, postId, pagePath }: BlogTrackerProps) {
    const visitIdRef = useRef<string | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        // Generate or reuse session ID
        let sessionId = sessionStorage.getItem("blog_session_id");
        if (!sessionId) {
            sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            sessionStorage.setItem("blog_session_id", sessionId);
        }

        // Record visit
        const recordVisit = async () => {
            try {
                const res = await fetch("/api/blog-track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        lawyer_id: lawyerId,
                        post_id: postId || null,
                        session_id: sessionId,
                        page_path: pagePath,
                        referrer: document.referrer || "",
                        user_agent: navigator.userAgent || "",
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    visitIdRef.current = data.id;
                }
            } catch (err) {
                console.error("[BlogTracker] Failed to record visit:", err);
            }
        };

        recordVisit();
        startTimeRef.current = Date.now();

        // Send duration update
        const sendDuration = () => {
            if (!visitIdRef.current) return;
            const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
            if (duration < 1) return;

            const payload = JSON.stringify({
                visit_id: visitIdRef.current,
                duration_seconds: duration,
            });

            // Try sendBeacon first (works during page unload)
            if (navigator.sendBeacon) {
                const blob = new Blob([payload], { type: "application/json" });
                navigator.sendBeacon("/api/blog-track", blob);
            } else {
                // Fallback to fetch
                fetch("/api/blog-track", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: payload,
                    keepalive: true,
                }).catch(() => {});
            }
        };

        // Update duration on visibility change and beforeunload
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                sendDuration();
            }
        };

        const handleBeforeUnload = () => {
            sendDuration();
        };

        // Also periodically update duration (every 30 seconds)
        const intervalId = setInterval(() => {
            if (visitIdRef.current && document.visibilityState === "visible") {
                const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
                fetch("/api/blog-track", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        visit_id: visitIdRef.current,
                        duration_seconds: duration,
                    }),
                }).catch(() => {});
            }
        }, 30000);

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            sendDuration();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            clearInterval(intervalId);
        };
    }, [lawyerId, postId, pagePath]);

    return null; // Invisible tracking component
}
