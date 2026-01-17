import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-transparent border-border-default text-primary hover:bg-bg-hover hover:border-border-strong',
        secondary: 'bg-transparent border-border-subtle text-secondary hover:text-primary hover:border-border-default',
        ghost: 'bg-transparent border-transparent text-secondary hover:bg-bg-tertiary hover:text-primary',
        danger: 'bg-transparent border-accent-error/30 text-accent-error hover:bg-accent-error/10 hover:border-accent-error',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs tracking-wider',
        md: 'px-6 py-2.5 text-sm tracking-widest',
        lg: 'px-12 py-4 text-sm tracking-widest',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
