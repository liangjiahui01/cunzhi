import { useState } from "react";

interface Props {
  src: string;
  alt?: string;
  className?: string;
}

export function ImagePreview({ src, alt = "", className = "" }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-pointer hover:opacity-90 transition-opacity ${className}`}
        onClick={() => setIsOpen(true)}
      />
      
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 shadow-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
