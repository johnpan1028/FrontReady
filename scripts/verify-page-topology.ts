import assert from 'node:assert/strict';
import { createPageDraft } from '../src/core/projectDocument';
import {
  clampPageBoardToTopology,
  derivePageLinkKind,
  resolveOverlayOrbitPosition,
  resolvePageBoardSize,
  syncOverlayFamilyToOwner,
} from '../src/builder/pageTopology';

const homePage = createPageDraft('Home', '/', {
  id: 'page-home',
  board: {
    x: 0,
    y: 0,
    width: 390,
    height: 844,
  },
});

const blogPage = createPageDraft('Blog', '/blog', {
  id: 'page-blog',
  board: {
    x: 980,
    y: 0,
    width: 1440,
    height: 900,
  },
});

const menuOverlaySize = resolvePageBoardSize('overlay', homePage);
assert.equal(menuOverlaySize.width, 390);
assert.equal(menuOverlaySize.height, 640);

const menuOverlay = createPageDraft('Menu Overlay', '/overlay-menu', {
  id: 'overlay-menu',
  kind: 'overlay',
  ownerPageId: homePage.id,
  board: {
    x: 0,
    y: 0,
    width: menuOverlaySize.width,
    height: menuOverlaySize.height,
  },
});

const toastOverlay = createPageDraft('Toast Overlay', '/overlay-toast', {
  id: 'overlay-toast',
  kind: 'overlay',
  ownerPageId: homePage.id,
  board: {
    x: 0,
    y: 0,
    width: 768,
    height: 1024,
  },
});

const blogOverlay = createPageDraft('Blog Drawer', '/overlay-blog-drawer', {
  id: 'overlay-blog-drawer',
  kind: 'overlay',
  ownerPageId: blogPage.id,
  board: {
    x: 0,
    y: 0,
    width: 768,
    height: 1024,
  },
});

assert.equal(derivePageLinkKind(homePage, blogPage), 'navigate-page');
assert.equal(derivePageLinkKind(homePage, menuOverlay), 'open-overlay');
assert.equal(derivePageLinkKind(menuOverlay, toastOverlay), 'switch-overlay');
assert.equal(derivePageLinkKind(menuOverlay, blogPage), 'return-page');
assert.equal(derivePageLinkKind(homePage, blogOverlay), null);

const orbitA = resolveOverlayOrbitPosition(homePage, menuOverlay.board.width, menuOverlay.board.height, 0);
const orbitB = resolveOverlayOrbitPosition(homePage, menuOverlay.board.width, menuOverlay.board.height, 1);
assert.notDeepEqual(orbitA, orbitB);

const clampedOverlay = clampPageBoardToTopology(
  [homePage, menuOverlay],
  menuOverlay,
  {
    width: 1440,
    height: 1200,
  },
);
assert.equal(clampedOverlay.width, homePage.board.width);
assert.equal(clampedOverlay.height, homePage.board.height);

const shrunkenHomePage = {
  ...homePage,
  board: {
    ...homePage.board,
    width: 320,
    height: 700,
  },
};

const syncedPages = syncOverlayFamilyToOwner(
  [shrunkenHomePage, menuOverlay, toastOverlay, blogPage, blogOverlay],
  shrunkenHomePage.id,
);

const syncedMenuOverlay = syncedPages.find((page) => page.id === menuOverlay.id);
const syncedToastOverlay = syncedPages.find((page) => page.id === toastOverlay.id);
const untouchedBlogOverlay = syncedPages.find((page) => page.id === blogOverlay.id);

assert.ok(syncedMenuOverlay);
assert.ok(syncedToastOverlay);
assert.ok(untouchedBlogOverlay);
assert.equal(syncedMenuOverlay?.board.width, 320);
assert.equal(syncedMenuOverlay?.board.height, 700);
assert.equal(syncedToastOverlay?.board.width, 320);
assert.equal(syncedToastOverlay?.board.height, 700);
assert.equal(untouchedBlogOverlay?.board.width, 768);
assert.equal(untouchedBlogOverlay?.board.height, 1024);

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        'overlay-size-clamps-to-owner',
        'topology-link-kinds-derive-correctly',
        'overlay-orbit-placement-is-stable',
        'overlay-family-resizes-with-owner-page',
      ],
    },
    null,
    2,
  ),
);
