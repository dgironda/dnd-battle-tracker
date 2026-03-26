
interface BackdropProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function Backdrop({ isOpen, onClick }: BackdropProps) {
  if (!isOpen) return null;
  
  return (
    <div 
      className="backdrop" 
      onClick={onClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 24,
      }}
    />
  );
}
