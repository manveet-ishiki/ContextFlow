import { MessageType, createMessage, type PageContentPayload } from '../messages';

/**
 * Content script for extracting page metadata
 * Runs on all pages to extract content for semantic search
 */

// Only run once per page load
if (!window.hasOwnProperty('contextFlowContentScriptLoaded')) {
  (window as any).contextFlowContentScriptLoaded = true;

  /**
   * Extracts meaningful content from the current page
   */
  function extractPageContent(): PageContentPayload {
    // Extract H1
    const h1Element = document.querySelector('h1');
    const h1 = h1Element?.textContent?.trim() || '';

    // Extract meta description
    const metaDescription = document.querySelector('meta[name="description"]')
      ?.getAttribute('content')?.trim() || '';

    // Extract main text content
    // Look for paragraphs, but filter out very short ones
    const paragraphs = Array.from(document.querySelectorAll('p, article p, main p'));
    const meaningfulParagraphs = paragraphs
      .map(p => p.textContent?.trim() || '')
      .filter(text => text.length > 50) // Only paragraphs with substantial content
      .slice(0, 3); // Take first 3 paragraphs

    // Create snippet from available content
    const snippetParts = [
      h1,
      metaDescription,
      ...meaningfulParagraphs
    ].filter(Boolean);

    const snippet = snippetParts
      .join(' ')
      .substring(0, 500); // Limit to 500 characters

    return {
      url: window.location.href,
      title: document.title,
      h1,
      metaDescription,
      snippet: snippet || document.title // Fallback to title if no content
    };
  }

  /**
   * Sends extracted content to background script
   */
  function sendContentToBackground() {
    // Wait for DOM to be fully loaded
    if (document.readyState !== 'complete') {
      window.addEventListener('load', sendContentToBackground);
      return;
    }

    // Skip empty pages or error pages
    if (!document.body || document.body.textContent?.trim().length === 0) {
      return;
    }

    // Extract content
    const content = extractPageContent();

    // Skip if no meaningful content
    if (!content.snippet || content.snippet.length < 10) {
      console.log('[ContentScript] Skipping page with no meaningful content');
      return;
    }

    // Send to background
    try {
      chrome.runtime.sendMessage(
        createMessage(MessageType.PAGE_CONTENT_EXTRACTED, content),
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[ContentScript] Error sending message:', chrome.runtime.lastError);
            return;
          }

          if (response?.success) {
            console.log('[ContentScript] Content extracted and sent successfully');
          }
        }
      );
    } catch (error) {
      console.error('[ContentScript] Failed to send content:', error);
    }
  }

  // Start extraction
  sendContentToBackground();
}
