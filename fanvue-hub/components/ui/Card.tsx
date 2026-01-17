import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'bordered' | 'elevated';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

export function Card({
    variant = 'default',
    padding = 'md',
    className = '',
    children,
    ...props
}: CardProps) {
    const baseStyles = 'bg-bg-card transition-all';

    const variants = {
        default: 'border border-border-subtle',
        bordered: 'border border-border-default hover:border-border-medium',
        elevated: 'border border-border-subtle shadow-md hover:shadow-lg',
    };

    const paddings = {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    return (
        <div
            className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
