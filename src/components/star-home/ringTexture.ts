/** 生成土星环纹理（Canvas 绘制） */
export function createRingTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // 渐变背景
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.1, 'rgba(210,180,140,0.1)');
  grad.addColorStop(0.25, 'rgba(210,180,140,0.6)');
  grad.addColorStop(0.35, 'rgba(180,150,100,0.9)');
  grad.addColorStop(0.45, 'rgba(200,170,120,1.0)');
  grad.addColorStop(0.55, 'rgba(200,170,120,1.0)');
  grad.addColorStop(0.65, 'rgba(180,150,100,0.8)');
  grad.addColorStop(0.75, 'rgba(160,130,80,0.5)');
  grad.addColorStop(0.85, 'rgba(210,180,140,0.2)');
  grad.addColorStop(0.92, 'rgba(200,180,160,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 轻微噪点模拟真实环的纹理
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const a = Math.random() * 0.15;
    ctx.fillStyle = `rgba(180,150,100,${a})`;
    ctx.fillRect(x, y, 2, 1);
  }

  return canvas;
}
