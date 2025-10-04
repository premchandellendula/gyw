"use client"

import React, { useState } from 'react'
import Flyout from './Flyout'

export default function Profile(){
    const [isFlyoutOpen, setIsFlyoutOpen] = useState(false)
    return (
        <div
        onClick={() => setIsFlyoutOpen(!isFlyoutOpen)}
        className="h-8 w-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-medium">
            <span className='uppercase'>u</span>
            {isFlyoutOpen && <Flyout setIsFlyoutOpen={setIsFlyoutOpen} />}
        </div>
    )
}