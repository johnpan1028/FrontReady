import type { BuilderPage, BuilderPageLink } from '../schema/project';
import {
  DESKTOP_OVERLAY_SHELL_HEIGHT,
  DESKTOP_OVERLAY_SHELL_WIDTH,
  DESKTOP_PAGE_SHELL_HEIGHT,
  DESKTOP_PAGE_SHELL_WIDTH,
} from './responsive';

const OVERLAY_ORBIT_ANGLES = [-26, 26, 92, 158, -158, -92] as const;
const OVERLAY_ORBIT_RING_STEP_X = 132;
const OVERLAY_ORBIT_RING_STEP_Y = 104;
const OVERLAY_ORBIT_OFFSET_X = 148;
const OVERLAY_ORBIT_OFFSET_Y = 110;

export const getPageById = (pages: BuilderPage[], pageId?: string | null) => (
  pageId ? pages.find((page) => page.id === pageId) ?? null : null
);

export const getOwnerPage = (pages: BuilderPage[], page: BuilderPage | null | undefined) => {
  if (!page || page.kind !== 'overlay') return null;
  return getPageById(pages, page.ownerPageId);
};

export const getOwnedOverlays = (pages: BuilderPage[], ownerPageId: string) => (
  pages.filter((page) => page.kind === 'overlay' && page.ownerPageId === ownerPageId)
);

export const derivePageLinkKind = (
  sourcePage: BuilderPage,
  targetPage: BuilderPage,
): BuilderPageLink['kind'] | null => {
  if (sourcePage.kind === 'page' && targetPage.kind === 'page') {
    return 'navigate-page';
  }

  if (
    sourcePage.kind === 'page' &&
    targetPage.kind === 'overlay' &&
    targetPage.ownerPageId === sourcePage.id
  ) {
    return 'open-overlay';
  }

  if (
    sourcePage.kind === 'overlay' &&
    targetPage.kind === 'overlay' &&
    sourcePage.ownerPageId &&
    sourcePage.ownerPageId === targetPage.ownerPageId
  ) {
    return 'switch-overlay';
  }

  if (sourcePage.kind === 'overlay' && targetPage.kind === 'page') {
    return 'return-page';
  }

  return null;
};

export const explainRejectedPageLink = (
  sourcePage: BuilderPage,
  targetPage: BuilderPage,
) => {
  if (sourcePage.kind === 'page' && targetPage.kind === 'overlay') {
    return 'A page can only open overlays that belong to itself.';
  }

  if (sourcePage.kind === 'overlay' && targetPage.kind === 'overlay') {
    return 'Overlay switching is limited to overlays in the same page orbit.';
  }

  if (sourcePage.kind === 'page' && targetPage.kind === 'page') {
    return 'Page-to-page flow is allowed.';
  }

  return 'That relation is outside the current topology rules.';
};

export const resolvePageBoardSize = (
  kind: BuilderPage['kind'],
  ownerPage?: BuilderPage | null,
) => {
  if (kind !== 'overlay' || !ownerPage) {
    return {
      width: DESKTOP_PAGE_SHELL_WIDTH,
      height: DESKTOP_PAGE_SHELL_HEIGHT,
    };
  }

  return {
    width: Math.min(DESKTOP_OVERLAY_SHELL_WIDTH, ownerPage.board.width),
    height: Math.min(DESKTOP_OVERLAY_SHELL_HEIGHT, ownerPage.board.height),
  };
};

export const clampPageBoardToTopology = (
  pages: BuilderPage[],
  page: BuilderPage,
  board: Partial<BuilderPage['board']>,
) => {
  const nextBoard = {
    ...page.board,
    ...board,
  };

  if (page.kind !== 'overlay') {
    return nextBoard;
  }

  const ownerPage = getOwnerPage(pages, page);
  if (!ownerPage) {
    return nextBoard;
  }

  return {
    ...nextBoard,
    width: Math.min(nextBoard.width, ownerPage.board.width),
    height: Math.min(nextBoard.height, ownerPage.board.height),
  };
};

export const resolveOverlayOrbitPosition = (
  ownerPage: BuilderPage,
  overlayWidth: number,
  overlayHeight: number,
  overlayIndex: number,
) => {
  const slotIndex = overlayIndex % OVERLAY_ORBIT_ANGLES.length;
  const ringIndex = Math.floor(overlayIndex / OVERLAY_ORBIT_ANGLES.length);
  const angle = (OVERLAY_ORBIT_ANGLES[slotIndex] * Math.PI) / 180;
  const centerX = ownerPage.board.x + ownerPage.board.width / 2;
  const centerY = ownerPage.board.y + ownerPage.board.height / 2;
  const radiusX = ownerPage.board.width / 2 + overlayWidth / 2 + OVERLAY_ORBIT_OFFSET_X + ringIndex * OVERLAY_ORBIT_RING_STEP_X;
  const radiusY = ownerPage.board.height / 2 + overlayHeight / 2 + OVERLAY_ORBIT_OFFSET_Y + ringIndex * OVERLAY_ORBIT_RING_STEP_Y;

  return {
    x: Math.round(centerX + Math.cos(angle) * radiusX - overlayWidth / 2),
    y: Math.round(centerY + Math.sin(angle) * radiusY - overlayHeight / 2),
  };
};

export const syncOverlayFamilyToOwner = (pages: BuilderPage[], ownerPageId: string) => {
  const nextPages = pages.map((page) => {
    if (page.kind !== 'overlay' || page.ownerPageId !== ownerPageId) {
      return page;
    }

    return {
      ...page,
      board: clampPageBoardToTopology(pages, page, page.board),
    };
  });

  return nextPages;
};
