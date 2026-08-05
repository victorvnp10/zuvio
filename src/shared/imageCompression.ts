/**
 * Compressão de imagem no navegador, antes do upload — o mesmo que o
 * Instagram faz: redimensiona para um teto razoável e reencoda como
 * JPEG numa qualidade que ainda parece boa, mas ocupa uma fração do
 * espaço de armazenamento do arquivo original.
 */
export async function compressImage(
  file: File,
  { maxDimension = 1280, quality = 0.75 }: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    // GIFs animados perderiam a animação se passassem por um canvas —
    // melhor enviar como está do que quebrar o arquivo.
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file; // navegador sem suporte a canvas 2D — envia sem comprimir

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;

  // Só usa a versão comprimida se ela realmente ficou menor — em fotos
  // já pequenas/comprimidas, reencodar pode até aumentar o tamanho.
  if (blob.size >= file.size) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
