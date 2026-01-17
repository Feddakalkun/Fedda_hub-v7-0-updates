import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
    const inputStyles = `
        w-full px-4 py-3 
        bg-bg-primary border border-border-default 
        text-primary placeholder:text-text-muted
        rounded-sm
        transition-all
        focus:outline-none focus:border-border-strong focus:bg-bg-secondary
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? 'border-accent-error' : ''}
        ${className}
    `;

    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label className="text-xs text-text-secondary tracking-wide uppercase">
                    {label}
                </label>
            )}
            <input className={inputStyles} {...props} />
            {error && (
                <span className="text-xs text-accent-error">{error}</span>
            )}
        </div>
    );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
    const textareaStyles = `
        w-full px-4 py-3 
        bg-bg-primary border border-border-default 
        text-primary placeholder:text-text-muted
        rounded-sm
        transition-all resize-vertical
        focus:outline-none focus:border-border-strong focus:bg-bg-secondary
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? 'border-accent-error' : ''}
        ${className}
    `;

    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label className="text-xs text-text-secondary tracking-wide uppercase">
                    {label}
                </label>
            )}
            <textarea className={textareaStyles} {...props} />
            {error && (
                <span className="text-xs text-accent-error">{error}</span>
            )}
        </div>
    );
}
