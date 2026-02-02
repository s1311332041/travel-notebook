import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false, title = '' }) => {
  const baseStyle = "px-4 py-2 rounded-md font-serif font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed border-b-2 active:border-b-0 active:translate-y-[2px]";
  const variants = {
    primary: "bg-[#8c7b6c] text-[#fdfbf7] border-[#6e5d50] hover:bg-[#7a6a5d] shadow-sm",
    secondary: "bg-[#fdfbf7] text-[#5c554b] border-[#d6d3cb] hover:bg-[#f2efe9]",
    danger: "bg-[#e8dcd8] text-[#8a4a4a] border-[#d1b8b8] hover:bg-[#dfcfcb]",
    ghost: "bg-transparent text-[#8c7b6c] border-transparent hover:bg-[#f0eadd] active:translate-y-0"
  };
  
  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
};