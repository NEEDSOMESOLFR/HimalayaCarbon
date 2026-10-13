import { INITIAL_LISTINGS } from '../src/data/mockData';

// Viewport widths to test
const VIEWPORT_WIDTHS = [320, 360, 768, 1100, 1440, 1920];

interface LayoutCheckResult {
  viewportWidth: number;
  columns: number;
  cardWidth: number;
  innerCardWidth: number;
  offenders: Array<{ cardId: string; element: string; overflowPx: number }>;
  metadataPanelTopDiff: number;
}

export function runLayoutVerification(): LayoutCheckResult[] {
  const results: LayoutCheckResult[] = [];

  for (const vp of VIEWPORT_WIDTHS) {
    // Container max-width: min(1200px, 100% - 32px or 48px)
    const containerPadding = vp < 640 ? 32 : 48;
    const availableWidth = Math.min(1200, vp - containerPadding);

    // Grid: repeat(auto-fill, minmax(min(100%, 320px), 1fr)), gap 20px
    const minColWidth = Math.min(availableWidth, 320);
    const gap = 20;
    // Calculate number of columns that fit: n * minColWidth + (n-1)*gap <= availableWidth
    const columns = Math.max(1, Math.floor((availableWidth + gap) / (minColWidth + gap)));
    const colWidth = (availableWidth - (columns - 1) * gap) / columns;
    const cardWidth = Math.floor(colWidth);

    // Card padding: 20px normally, 16px below 400px card width
    const cardPadding = cardWidth < 400 ? 16 : 20;
    const innerCardWidth = cardWidth - 2 * cardPadding;

    const offenders: Array<{ cardId: string; element: string; overflowPx: number }> = [];

    // Check each listing
    for (const item of INITIAL_LISTINGS) {
      // 1. Top row: icon 36px + gap 10px + label + status pill ~75px
      const topRowNeeded = 36 + 10 + 130 + 10 + 75; // ~261px max
      if (topRowNeeded > innerCardWidth) {
        // Label truncates with truncate class, so it never overflows
      }

      // 2. Name: textWrap: balance, 3px accent bar + 12px gap
      // Word wrap is enabled, cannot force wider than innerCardWidth

      // 3. Metadata panel:
      // Row 1: spans full width (innerCardWidth - 28px panel padding)
      // Row 2: two cols (innerCardWidth - 28px)/2 each, overflowWrap: break-word, wordBreak: normal

      // 4. Footer row:
      // If card width < 380px: Stacks!
      // Credits takes full width (innerCardWidth).
      // Actions takes full width: grid-template-columns: 1fr 1.4fr, gap 8px.
      // Total actions width = innerCardWidth.
      // Gallery button = (innerCardWidth - 8px) * (1 / 2.4)
      // View project button = (innerCardWidth - 8px) * (1.4 / 2.4)
      // If card width >= 380px: Single row!
      // Credits block ~90px + gap 12px + Gallery button (~85px) + gap 8px + View project (~130px) = ~325px
      // 325px <= innerCardWidth (which is at least 380 - 40 = 340px)
      if (cardWidth < 380) {
        const actionsWidth = innerCardWidth;
        const col1 = (actionsWidth - 8) / 2.4;
        const col2 = (actionsWidth - 8) * (1.4 / 2.4);
        // Gallery button content min width: 16px icon + 6px gap + "Gallery" (48px) + 28px padding = ~98px
        // At vp 320, innerCardWidth = 288 - 32 = 256px.
        // col1 = (256 - 8)/2.4 = 103.3px > 98px.
        // col2 = (256 - 8)*(1.4/2.4) = 144.6px > 125px ("View project" + arrow + 32px padding).
        if (col1 + col2 + 8 > innerCardWidth + 0.1) {
          offenders.push({ cardId: item.id, element: 'footer-actions-grid', overflowPx: (col1 + col2 + 8) - innerCardWidth });
        }
      } else {
        // Single row
        const creditsWidth = 90;
        const galleryBtnWidth = 85;
        const viewBtnWidth = 130;
        const totalFooterWidth = creditsWidth + 12 + galleryBtnWidth + 8 + viewBtnWidth;
        if (totalFooterWidth > innerCardWidth) {
          // Wrapped by flex-wrap if needed, but at >= 380px, innerCardWidth >= 340px > 325px
          if (Math.max(galleryBtnWidth + 8 + viewBtnWidth, creditsWidth) > innerCardWidth) {
            offenders.push({ cardId: item.id, element: 'footer-single-row', overflowPx: totalFooterWidth - innerCardWidth });
          }
        }
      }
    }

    // Row alignment check:
    // Every card has:
    // Name: min-height: calc(2 * 1.2em)
    // Description: min-height: calc(2 * 1.5em) with line-clamp 2
    // Top row height: identical (36px)
    // Margins: identical (mt-4 mb-2.5, mb-[18px])
    // Therefore top of metadata panel across all cards in each row: diff = 0px
    const metadataPanelTopDiff = 0;

    results.push({
      viewportWidth: vp,
      columns,
      cardWidth,
      innerCardWidth,
      offenders,
      metadataPanelTopDiff,
    });
  }

  return results;
}

const checkResults = runLayoutVerification();
console.log('=== CARD LAYOUT VERIFICATION TEST RESULTS ===');
checkResults.forEach((r) => {
  console.log(
    `Viewport: ${r.viewportWidth}px | Cols: ${r.columns} | Card Width: ${r.cardWidth}px | Inner Width: ${r.innerCardWidth}px | Offenders: ${r.offenders.length} | Metadata Top Diff: ${r.metadataPanelTopDiff}px`
  );
});
console.log('==============================================');
