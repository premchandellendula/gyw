"use client"
import React from 'react'
import NotificationIcon from '../icons/NotificationIcon'
import { Button } from '../ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Profile from './Profile';
import PlusIcon from '../icons/PlusIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const user = {
  name: 'John Doe',
  role: 'employer', // Change to 'applicant' or null to test
};

const Navbar = () => {
    const isLoggedIn = !!user;
    const isEmployer = user?.role === 'employer';
    const router = useRouter();
    return (
        <nav id='navbar' className='w-full flex justify-between items-center px-8 py-3 border-b'>
            <h2 className="text-2xl font-semibold text-primary cursor-pointer select-none">
                GetYourWork
            </h2>
            <div className='flex items-center gap-4'>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={() => router.push('/jobs')}
                            variant={"ghost"}
                            className='cursor-pointer md:block hidden'
                        >
                            Jobs
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Jobs
                    </TooltipContent>
                </Tooltip>
                {isEmployer && (
                    <Link href="/post-job">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button>
                                    <PlusIcon />
                                    <span className='md:block hidden'>Post a Job</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Post a Job
                            </TooltipContent>
                        </Tooltip>
                    </Link>
                )}
                {isLoggedIn && (
                    <button className="relative">
                        <NotificationIcon />
                        <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full border border-white" />
                    </button>
                )}

                {isLoggedIn ? (
                    <>
                        {/* <div className="h-8 w-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-medium uppercase">
                            {user.name.charAt(0)}
                        </div> */}
                        <Profile />
                    </>
                ) : (
                <div className="flex gap-2">
                    <Link href="/login">
                        <button className="text-sm text-primary hover:underline">Login</button>
                    </Link>
                    <Link href="/signup">
                        <button className="text-sm text-primary hover:underline">Signup</button>
                    </Link>
                </div>
                )}
            </div>
        </nav>
    )
}

export default Navbar