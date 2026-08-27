/**
 * QR symbol generation, kept behind a dynamic `import()` so `qrcode-generator` only reaches the
 * browser once someone actually opens the send dialog — it never lands in the initial bundle.
 */

/** The finished symbol, reduced to what drawing needs so callers never see the library's types. */
export type QrSymbol = {
  /** Modules per side, excluding the quiet zone. */
  readonly size: number;
  isDark(row: number, column: number): boolean;
};

/** Modules of empty margin the QR spec requires around a symbol for a scanner to lock onto it. */
const QUIET_ZONE = 4;

/** Roughly how many device pixels the drawn symbol should occupy, before rounding to whole modules. */
const TARGET_PIXELS = 512;

const importQrCodeGenerator = async () => {
  // `qrcode-generator` declares itself with `export =`; the ESM build it actually ships puts the
  // factory on `default`, which is also what TypeScript's synthetic default resolves to.
  const module = await import('qrcode-generator');
  return module.default;
};

let factory: ReturnType<typeof importQrCodeGenerator> | null = null;

const loadFactory = (): ReturnType<typeof importQrCodeGenerator> =>
  (factory ??= importQrCodeGenerator());

/**
 * Encodes one frame at error-correction level M — the level the chunk size in `qr-frames.ts` is
 * sized against. Type number 0 lets the library pick the smallest version that fits.
 */
export const buildQrSymbol = async (text: string): Promise<QrSymbol> => {
  const qrcode = await loadFactory();
  const code = qrcode(0, 'M');
  code.addData(text, 'Byte');
  code.make();
  return {
    size: code.getModuleCount(),
    isDark: (row, column) => code.isDark(row, column),
  };
};

/**
 * Paints a symbol onto a canvas at whole-module scale, resizing the canvas to match. Black on
 * white regardless of theme: a scanner needs the contrast, and daisyUI's `base-100` is not white
 * in every theme this app ships.
 */
export const drawQrSymbol = (canvas: HTMLCanvasElement, symbol: QrSymbol): void => {
  const modules = symbol.size + QUIET_ZONE * 2;
  const scale = Math.max(1, Math.floor(TARGET_PIXELS / modules));
  const side = modules * scale;

  canvas.width = side;
  canvas.height = side;

  // jsdom has no 2D context, so specs mounting the dialog land here with `null` — and a frame that
  // cannot be painted is not an error worth surfacing to the user either.
  const context = canvas.getContext('2d');
  if (!context) return;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, side, side);
  context.fillStyle = '#000000';
  for (let row = 0; row < symbol.size; row++) {
    for (let column = 0; column < symbol.size; column++) {
      if (symbol.isDark(row, column)) {
        context.fillRect((column + QUIET_ZONE) * scale, (row + QUIET_ZONE) * scale, scale, scale);
      }
    }
  }
};
