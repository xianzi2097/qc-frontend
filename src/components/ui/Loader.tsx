import './Loader.css';

interface Props {
  text?: string;
  className?: string;
}

export default function Loader({ text = '加载中...', className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-12 ${className}`}>
      <div className="loader" />
      <p className="text-slate-400 text-sm">{text}</p>
    </div>
  );
}
