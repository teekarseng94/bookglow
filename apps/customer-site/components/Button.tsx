import React from 'react';
import { PRIMARY_GREEN } from '../constants';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: `text-white shadow-sm hover:opacity-90`,
    secondary: `bg-slate-100 text-slate-900 hover:bg-slate-200`,
    outline: `border-2 border-slate-200 text-slate-700 hover:bg-slate-50`
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const styleObj = variant === 'primary' ? { backgroundColor: PRIMARY_GREEN } : {};

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      style={styleObj}
      {...props}
    >
      {children}
    </button>
  );
};