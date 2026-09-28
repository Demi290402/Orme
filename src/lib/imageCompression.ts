/**
 * Utility per la compressione automatica lato client delle immagini caricate dagli utenti su Orme.
 * Ridimensiona l'immagine mantenendo le proporzioni e la converte in WebP/JPEG ottimizzato.
 */

export async function compressImage(
    fileOrBlob: File | Blob,
    maxWidth = 1200,
    maxHeight = 800,
    quality = 0.8
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(fileOrBlob);

        reader.onload = (event) => {
            const rawDataUrl = event.target?.result as string;
            const img = new Image();
            img.src = rawDataUrl;

            img.onload = () => {
                let { width, height } = img;

                // Calcola proporzioni senza ingrandire immagini già piccole
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(rawDataUrl);
                    return;
                }

                // Disegna su canvas con interpolazione di qualità
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // Prova prima WebP per la massima compressione
                try {
                    let compressed = canvas.toDataURL('image/webp', quality);
                    if (compressed.startsWith('data:image/webp')) {
                        resolve(compressed);
                        return;
                    }
                } catch {
                    // Fallback a JPEG se WebP non supportato
                }

                const jpegCompressed = canvas.toDataURL('image/jpeg', quality);
                resolve(jpegCompressed);
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
}

/**
 * Calcola approssimativamente la dimensione in KB di una stringa Base64 dataURL
 */
export function getBase64SizeInKB(base64String: string): number {
    const stringLength = base64String.length - (base64String.indexOf(',') + 1);
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489633438312;
    return Math.round(sizeInBytes / 1024);
}
