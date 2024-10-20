// Modal.tsx
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: Blob | null;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, file }) => {
  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-4 rounded relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-black"
          aria-label="Close"
        >
          &times;
        </button>
        <iframe
          src={URL.createObjectURL(file)}
          className="w-full h-[80vh]"
          title="PDF Viewer"
        />
      </div>
    </div>
  );
};

export default Modal;

