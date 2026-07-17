/** Triggers a client-side download of `data` as a JSON file — no network request. */
export const downloadJson = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
