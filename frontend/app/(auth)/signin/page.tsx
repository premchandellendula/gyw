'use client';

import BottomWarning from '@/components/auth/BottomWarning';
import Heading from '@/components/auth/Heading';
import PasswordInput from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React from 'react';
import { useForm } from 'react-hook-form';

type FormData = {
  email: string;
  password: string;
};

export default function SigninPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    console.log('✅ Sign In data:', data);
    // handle login
  };

    return (
        <div className="flex justify-center items-center h-screen">
            <div className="bg-background rounded-lg shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] w-96 p-4">
                <Heading size="2xl" text="Signin" />
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                    <div className="flex flex-col gap-3">
                    <div>
                        <Input
                            type="email"
                            {...register('email', {
                                required: 'Email is required',
                                pattern: {
                                value: /^\S+@\S+$/i,
                                message: 'Invalid email format',
                                },
                            })}
                            placeholder='johndoe@gmail.com'
                            className={`w-full px-3 py-2 border rounded focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                                errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        />
                        {isSubmitted && errors.email && (
                            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <PasswordInput
                            type="password"
                            {...register('password', {
                                required: 'Password is required',
                            })}
                            placeholder='Password@123'
                            className={`w-full px-3 py-2 border rounded focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                                errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        />
                        {isSubmitted && errors.password && (
                            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                        )}
                    </div>
                    <Button type="submit">
                        Signin
                    </Button>
                    <BottomWarning label="Doesn't have an account?" buttonText="Signup" to="/signup" />
                    </div>
                </form>
            </div>
        </div>
    );
}
