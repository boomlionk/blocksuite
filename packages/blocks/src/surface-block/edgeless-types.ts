import type { BlockProps } from '@blocksuite/store';

import type { BookmarkBlockModel } from '../bookmark-block/bookmark-model.js';
import type { FrameBlockModel } from '../frame-block/index.js';
import type { ImageBlockModel } from '../image-block/image-model.js';
import type { NoteBlockModel } from '../note-block/note-model.js';
import type {
  CanvasElementType,
  IElementCreateProps,
} from './elements/edgeless-element.js';

export enum EdgelessBlockType {
  FRAME = 'affine:frame',
  NOTE = 'affine:note',
  IMAGE = 'affine:image',
  BOOKMARK = 'affine:bookmark',
}

export type EdgelessBlockModelMap = {
  [EdgelessBlockType.FRAME]: FrameBlockModel;
  [EdgelessBlockType.NOTE]: NoteBlockModel;
  [EdgelessBlockType.IMAGE]: ImageBlockModel;
  [EdgelessBlockType.BOOKMARK]: BookmarkBlockModel;
};

export enum EdgelessElementType {
  FRAME = 'affine:frame',
  NOTE = 'affine:note',
  IMAGE = 'affine:image',
  BOOKMARK = 'affine:bookmark',
  SHAPE = 'shape',
  BRUSH = 'brush',
  CONNECTOR = 'connector',
  TEXT = 'text',
  GROUP = 'group',
  DEBUG = 'debug',
}

export type IEdgelessElementCreateProps<T extends EdgelessElementType> =
  T extends CanvasElementType
    ? IElementCreateProps<T>
    : Partial<BlockProps & Omit<BlockProps, 'flavour'>>;
