import { useCallback, useState } from 'react';

type ExportPayload = string | Blob | ArrayBuffer | Uint8Array;

interface FileExportOptions {
  filename: string;
  loader: () => Promise<ExportPayload>;
  mimeType: string;
}

function toBlob(payload: ExportPayload, mimeType: string) {
  if (payload instanceof Blob) {
    return payload;
  }

  if (payload instanceof ArrayBuffer) {
    return new Blob([new Uint8Array(payload)], { type: mimeType });
  }

  return new Blob([payload], { type: mimeType });
}

export function useFileExport() {
  const [exporting, setExporting] = useState(false);

  const runExport = useCallback(async ({ filename, loader, mimeType }: FileExportOptions) => {
    setExporting(true);

    try {
      const payload = await loader();
      const blob = toBlob(payload, mimeType);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    exporting,
    runExport,
  };
}
