import * as WebBrowser from 'expo-web-browser';

// Browser-style download (opens Chrome/Safari)
export async function openDownloadInBrowser(url) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch (err) {
    console.error("Browser download error:", err);
    throw err;
  }
}

