"use client";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function UserAvatar({
    name,
    email,
    image,
    size = "md",
    className
}: UserAvatarProps) {
    // Get initials from name or email
    const getInitials = () => {
        if (name) {
            const parts = name.split(" ");
            if (parts.length >= 2) {
                return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
            }
            return name.slice(0, 2).toUpperCase();
        }
        if (email) {
            return email.slice(0, 2).toUpperCase();
        }
        return "U";
    };

    const sizeClasses = {
        sm: "h-7 w-7 text-xs",
        md: "h-9 w-9 text-sm",
        lg: "h-12 w-12 text-base",
    };

    // Generate a consistent color based on email/name
    const getColorClass = () => {
        const str = email || name || "";
        const colors = [
            "bg-blue-500/20 text-blue-400",
            "bg-purple-500/20 text-purple-400",
            "bg-green-500/20 text-green-400",
            "bg-orange-500/20 text-orange-400",
            "bg-pink-500/20 text-pink-400",
            "bg-cyan-500/20 text-cyan-400",
        ];
        const hash = str.split("").reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    };

    if (image) {
        return (
            <img
                src={image}
                alt={name || email || "User"}
                className={cn(
                    "rounded-full object-cover ring-2 ring-border",
                    sizeClasses[size],
                    className
                )}
            />
        );
    }

    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-full font-medium ring-2 ring-border",
                sizeClasses[size],
                getColorClass(),
                className
            )}
            title={email || name || undefined}
        >
            {getInitials()}
        </div>
    );
}
