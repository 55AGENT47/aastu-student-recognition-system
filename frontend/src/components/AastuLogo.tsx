interface AastuLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}
import logoImage from '../assets/images/download-removebg-preview.png';

export default function AastuLogo({ className = '', size = 'md' }: AastuLogoProps) {
  
  const sizeClasses = {
    sm: 'h-12 w-auto',
    md: 'h-16 w-auto',
    lg: 'h-24 w-auto'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <img
        src={logoImage}
        alt="AASTU Logo"
        className={sizeClasses[size]}
      />
      {!className.includes('text-white') && (
        <div className={`font-bold ${textSizes[size]}`}>
          <span className="text-[#D4AF37]">AAS</span>
          <span className="text-[#1E3A8A]">TU</span>
        </div>
      )}
    </div>
  );
}
