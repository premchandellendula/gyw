'use client';

import BottomWarning from '@/components/auth/BottomWarning';
import Heading from '@/components/auth/Heading';
import PasswordInput from '@/components/auth/PasswordInput';
import Spinner from '@/components/loaders/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

type FormData = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
};

export default function SignupPage() {
    const [loading, setLoading] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitted },
        watch,
    } = useForm<FormData>();

    const password = watch('password', '');

    const onSubmit = (data: FormData) => {
        console.log('✅ Form submitted:', data);
    };

    return (
        <div className="flex justify-center items-center h-screen">
            <div className="bg-background rounded-lg shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] w-96 p-4">
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                    <div className="flex flex-col gap-3">
                        <Heading size="2xl" text="Signup" />
                        <div>
                            <Input
                                type="text"
                                {...register('name', { required: 'Name is required' })}
                                placeholder='John Doe'
                                className={`w-full px-3 py-2 border rounded focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                                    errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                            />
                            {isSubmitted && errors.name && (
                                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                            )}
                        </div>

                        <div>
                            <Input
                                type="email"
                                placeholder="johndoe@example.com"
                                {...register('email', {
                                    required: 'Email is required',
                                    pattern: {
                                    value: /^\S+@\S+$/i,
                                    message: 'Invalid email format',
                                    },
                                })}
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
                                placeholder='Password@123'
                                {...register('password', {
                                    required: 'Password is required',
                                    validate: {
                                    minLength: (v) =>
                                        v.length >= 8 || 'Must be at least 8 characters',
                                    hasUpper: (v) =>
                                        /[A-Z]/.test(v) || 'Must contain at least one uppercase letter',
                                    hasNumber: (v) =>
                                        /\d/.test(v) || 'Must contain at least one number',
                                    hasSpecial: (v) =>
                                        /[!@#$%^&*]/.test(v) ||
                                        'Must contain at least one special character (!@#$%^&*)',
                                    },
                                })}
                                className={`w-full px-3 py-2 border rounded focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                                    errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                            />
                            {isSubmitted && errors.password && (
                                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        <div>
                            <PasswordInput
                                type="password"
                                placeholder='Password@123'
                                {...register('confirmPassword', {
                                    required: 'Please confirm your password',
                                    validate: (value) =>
                                    value === password || 'Passwords do not match',
                                })}
                                className={`w-full px-3 py-2 border rounded focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                                    errors.confirmPassword
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}
                            />
                            {isSubmitted && errors.confirmPassword && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>
                        <Button type="submit">
                            {loading ? (
                                <Spinner />
                            ) : (
                                "Signup"
                            )}
                        </Button>
                        <BottomWarning label="Already have an account?" buttonText="Signin" to="/signin" />
                </div>
                </form>
            </div>
        </div>
    );
}
