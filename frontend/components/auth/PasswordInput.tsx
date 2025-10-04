// "use client"
// import { cn } from "@/lib/utils";
// import { ChangeEvent, useState } from "react";

// interface IPasswordInputBox {
//     name: string,
//     id: string,
//     placeholder: string,
//     onChange: (e: ChangeEvent<HTMLInputElement>) => void
// }

// export default function PasswordInput({ className, type, ...props }: React.ComponentProps<"input">){
//     const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    
//     const togglePasswordVisibility = () => {
//         setIsPasswordVisible(!isPasswordVisible)
//     }
//     return (
//         <div className="relative flex flex-col gap-1.5">
//             <input
//                 name={props.name}
//                 id={props.id}
//                 onChange={props.onChange}
//                 type={isPasswordVisible ? "text" : "password"} 
//                 placeholder={props.placeholder}
//                 className={cn(
//                         "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border outline:none bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
//                         "focus-visible:ring-ring/20 focus-visible:ring-[2px]",
//                         "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
//                         className
//                       )}
//             />
//             <button type="button" onClick={togglePasswordVisibility} className="absolute bottom-0 right-0 flex h-10 items-center px-4 text-gray-600">
//                 {isPasswordVisible ? (
//                     <>
//                         <svg
//                             xmlns="http://www.w3.org/2000/svg"
//                             fill="none"
//                             viewBox="0 0 24 24"
//                             strokeWidth={1.5}
//                             stroke="currentColor"
//                             className="h-5 w-5 cursor-pointer"
//                         >
//                             <path
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
//                             />
//                         </svg>
//                     </>
//                     ) : (
//                     <>
//                         <svg
//                             xmlns="http://www.w3.org/2000/svg"
//                             fill="none"
//                             viewBox="0 0 24 24"
//                             strokeWidth={1.5}
//                             stroke="currentColor"
//                             className="h-5 w-5 cursor-pointer"
//                             >
//                             <path
//                                 strokeLinecap="round"
//                                 strokeLinejoin="round"
//                                 d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
//                             />
//                             <path
//                                 strokeLinecap="round"
//                                 strokeLinejoin="round"
//                                 d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
//                             />
//                         </svg>
//                     </>
//                 )}
//             </button>
//         </div>
//     )
// }

'use client';

import React, { useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type PasswordInputProps = React.ComponentProps<'input'>;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const togglePasswordVisibility = () => {
      setIsPasswordVisible(!isPasswordVisible);
    };

    return (
      <div className="relative flex flex-col gap-1.5">
        <input
          {...props}
          ref={ref}
          type={isPasswordVisible ? 'text' : 'password'}
          className={cn(
            'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border outline:none bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'focus-visible:ring-ring/20 focus-visible:ring-[2px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
            className
          )}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute bottom-0 right-0 flex h-10 items-center px-4 text-gray-600"
        >
          {isPasswordVisible ? (
            <EyeSlashIcon />
          ) : (
            <EyeIcon />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput'; // required for forwardRef components

export default PasswordInput;

// Icons (can be moved to a separate file or replaced with Heroicons)
function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5 cursor-pointer"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5 cursor-pointer"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}
