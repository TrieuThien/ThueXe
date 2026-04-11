import { Loader2 } from "lucide-react";

export default function SkeletonBlock({ className = "h-20" }) {
    return (
        <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`}>
            <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        </div>
    );
}
