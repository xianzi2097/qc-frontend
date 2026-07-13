import { useLoading } from '../../lib/useLoading';
import Loader from './Loader';

export default function LoadingOverlay() {
  const { loading, text } = useLoading();
  if (!loading) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-cyber-bg">
      <Loader text={text} />
    </div>
  );
}
