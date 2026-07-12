/** 星球主页左上角 Logo — 纯展示，玻璃态效果 */
export default function StarHomeLogo() {
  return (
    <div
      className="fixed top-5 left-6 z-100 pointer-events-none
        bg-black/50 backdrop-blur-lg px-5 py-2.5 rounded-2xl
        border border-orange-500/25 leading-tight"
    >
      <div className="text-white text-xl font-black tracking-wide">
        QC-Studio
        <span
          className="text-[10px] font-semibold text-orange-500
            bg-orange-500/15 px-1.5 py-px rounded-lg ml-1.5 align-middle"
        >
          Beta
        </span>
      </div>
      <div className="text-white/40 text-xs font-normal mt-0.5">
        青橙少儿编程学习平台
      </div>
    </div>
  );
}
