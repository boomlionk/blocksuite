/// <reference types="@blocksuite/global" />
// manual import to avoid being tree-shaken
import './page-block/index.js';
import './paragraph-block/index.js';
import './list-block/index.js';
import './note-block/index.js';
import './frame-block/index.js';
import './divider-block/index.js';
import './code-block/affine-code-line.js';
import './image-block/index.js';
import './database-block/index.js';
import './surface-ref-block/index.js';

import { mindMap } from './_common/mind-map/index.js';
import { matchFlavours } from './_common/utils/index.js';
import { splitElements } from './page-block/edgeless/utils/clipboard-utils.js';

export * from './_common/adapters/index.js';
export {
  type AffineInlineEditor,
  RichText,
} from './_common/components/index.js';
export {
  EdgelessPresentationConsts as EdgelessPresentationConsts,
  type NavigatorMode,
} from './_common/edgeless/frame/consts.js';
export * from './_common/test-utils/test-utils.js';
export {
  ColorVariables,
  FontFamilyVariables,
  SizeVariables,
  StyleVariables,
} from './_common/theme/css-variables.js';
export {
  extractCssVariables,
  ThemeObserver,
} from './_common/theme/theme-observer.js';
export * from './_common/transformers/index.js';
export { type AbstractEditor } from './_common/types.js';
export { on, once } from './_common/utils/event.js';
export { createDefaultPage } from './_common/utils/init.js';
export type { BlockModels } from './_common/utils/model.js';
export { getThemeMode } from './_common/utils/query.js';
export { getServiceOrRegister } from './_legacy/service/index.js';
export type { BaseService } from './_legacy/service/service.js';
export * from './_specs/_specs.js';
export * from './attachment-block/index.js';
export * from './bookmark-block/index.js';
export * from './code-block/index.js';
export * from './data-view-block/index.js';
export * from './database-block/index.js';
export * from './divider-block/index.js';
export * from './embed-html-block/embed-html-block.js';
export * from './embed-html-block/embed-html-model.js';
export * from './embed-html-block/embed-html-service.js';
export * from './embed-html-block/embed-html-spec.js';
export * from './frame-block/index.js';
export * from './image-block/index.js';
export * from './list-block/index.js';
export * from './models.js';
export * from './note-block/index.js';
export * from './page-block/index.js';
export * from './paragraph-block/index.js';
export {
  Bound,
  CanvasElementType,
  ConnectorEndpointStyle,
  ConnectorMode,
  EdgelessBlockType,
  generateKeyBetween,
  ShapeStyle,
  StrokeStyle,
} from './surface-block/index.js';
export { SurfaceBlockComponent } from './surface-block/surface-block.js';
export { SurfaceBlockSchema } from './surface-block/surface-model.js';
export * from './surface-block/surface-service.js';
export * from './surface-ref-block/index.js';

export const BlocksUtils = {
  splitElements,
  matchFlavours,
  mindMap,
};

const env: Record<string, unknown> =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : // @ts-ignore
        typeof global !== 'undefined'
        ? // @ts-ignore
          global
        : {};
const importIdentifier = '__ $BLOCKSUITE_BLOCKS$ __';

if (env[importIdentifier] === true) {
  // https://github.com/yjs/yjs/issues/438
  console.error(
    '@blocksuite/blocks was already imported. This breaks constructor checks and will lead to issues!'
  );
}

if (typeof window === 'undefined') {
  throw new Error(
    'Seems like you are importing @blocksuite/blocks in SSR mode. Which is not supported for now.'
  );
}

env[importIdentifier] = true;
