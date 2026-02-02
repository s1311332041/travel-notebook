import React from 'react';

export const Input = (props) => (
  <input 
    {...props}
    className={`w-full bg-transparent border-b-2 border-[#d6d3cb] px-2 py-2 text-[#4a453e] placeholder-[#a8a49d] focus:border-[#8c7b6c] focus:outline-none transition-colors font-serif ${props.className || ''}`}
  />
);

export const Textarea = (props) => (
  <textarea 
    {...props}
    className="w-full bg-[#fdfbf7] border-2 border-[#d6d3cb] rounded-lg px-3 py-2 text-[#4a453e] placeholder-[#a8a49d] focus:border-[#8c7b6c] focus:outline-none transition-colors resize-none font-serif leading-relaxed"
    style={{ backgroundImage: 'linear-gradient(#fdfbf7 95%, #f0f0f0 5%)', backgroundSize: '100% 2rem', lineHeight: '2rem' }}
  />
);