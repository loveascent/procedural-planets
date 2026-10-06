// WebGPU-Start der Welt-Seite: Adapter (hohe Leistung), Gerät, Leinwand, Tiefenpuffer.
export interface Geraet {
  dev: GPUDevice;
  ctx: GPUCanvasContext;
  format: GPUTextureFormat;
  canvas: HTMLCanvasElement;
  tiefe(): GPUTextureView;
  groesse(): [number, number];
  anpassen(): void;
}

export async function starteGeraet(canvas: HTMLCanvasElement): Promise<Geraet> {
  if (!navigator.gpu) throw new Error('WebGPU nicht verfügbar');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('Kein WebGPU-Adapter');
  const dev = await adapter.requestDevice();
  dev.lost.then((i) => console.error('GPU verloren:', i.message));
  const ctx = canvas.getContext('webgpu') as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device: dev, format, alphaMode: 'opaque' });
  let tiefeTex: GPUTexture | null = null, tiefeView: GPUTextureView | null = null;
  let w = 0, h = 0;
  const anpassen = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nw = Math.max(2, Math.floor(canvas.clientWidth * dpr)), nh = Math.max(2, Math.floor(canvas.clientHeight * dpr));
    if (nw === w && nh === h && tiefeTex) return;
    w = nw; h = nh; canvas.width = w; canvas.height = h;
    tiefeTex?.destroy();
    tiefeTex = dev.createTexture({ size: [w, h], format: 'depth32float', usage: GPUTextureUsage.RENDER_ATTACHMENT });
    tiefeView = tiefeTex.createView();
  };
  anpassen();
  return { dev, ctx, format, canvas, tiefe: () => tiefeView!, groesse: () => [w, h], anpassen };
}
