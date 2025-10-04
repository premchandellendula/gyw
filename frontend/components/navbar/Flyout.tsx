"use client"
import ThemeSwitch from "@/app/theme/ThemeButton";
// import { useUser } from "@/hooks/useUser";
import { useEffect, useRef} from "react";

interface IFlyout {
    setIsFlyoutOpen: (value: boolean) => void
}

export default function Flyout({setIsFlyoutOpen}: IFlyout){
    // const { user, logout } = useUser()
    const ref = useRef<HTMLDivElement>(null);

    const handleClickOutside = (event: MouseEvent) => {
        if(ref.current && !ref.current.contains(event.target as Node)){
            setIsFlyoutOpen(false)
        }
    }

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])
    return (
        <div ref={ref} className="absolute top-16 right-8 bg-white dark:bg-gray-900 shadow-[0px_1px_1px_-1px_rgba(0,0,0,0.1),0px_0px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] text-black dark:text-gray-300 rounded-md w-56 py-4 px-2 z-50 flex flex-col">
            <div className="border-b mb-2 flex items-center gap-2 p-2">
                <p className="h-8 w-8 bg-primary rounded-full"></p>
                <div className="">
                    <p className="font-semibold text-base">John Doe</p>
                    <p className="text-xs text-accent-foreground/60">Open to work</p>
                </div>
            </div>
            <div className="hover:bg-neutral-200/60 dark:hover:bg-gray-800 rounded-sm px-2 p-1">
                <span className="text-sm">Profile</span>
            </div>
            <div className="hover:bg-neutral-200/60 dark:hover:bg-gray-800 rounded-sm px-2 p-1">
                <span className="text-sm">Jobs</span>
            </div>
            <div className="hover:bg-neutral-200/60 dark:hover:bg-gray-800 rounded-sm px-2 p-1">
                <span className="text-sm">Applied</span>
            </div>
            <div className="hover:bg-neutral-200/60 dark:hover:bg-gray-800 rounded-sm px-2 p-1">
                <span className="text-sm">Settings</span>
            </div>
            <div className="hover:bg-neutral-200/60 dark:hover:bg-gray-800 rounded-sm px-2 p-1">
                <span className="text-sm">Notifications</span>
            </div>
            <div className="hover:bg-neutral-200/60 dark:hover:bg-gray-800 rounded-sm px-2 p-1">
                <span className="text-sm">Help</span>
            </div>
            <div className="hover:bg-neutral-200/60 dark:hover:bg-gray-800 rounded-sm px-2 p-1">
                <span className="text-sm">Logout</span>
            </div>
            <div className="hover:bg-neutral-200/60 dark:hover:bg-gray-800 rounded-sm px-2 p-1">
                <ThemeSwitch />
            </div>
        </div>
    )
}