import { httpClient } from './httpClient';

type UploadResponse = {
  url: string;
};

function detectMimeType(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export async function uploadImageFile(imageUri: string, fileName?: string): Promise<string> {
  const resolvedFileName = fileName && fileName.includes('.') ? fileName : `photo-${Date.now()}.jpg`;

  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: resolvedFileName,
    type: detectMimeType(resolvedFileName),
  } as any);

  const response = await httpClient.post<UploadResponse>('/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.url;
}
