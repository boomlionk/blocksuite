import { BaseBlockModel, defineBlockSchema } from '@blocksuite/store';

/**
 * When the attachment is uploading, the `sourceId` is `undefined`.
 * And we can query the upload status by the `isAttachmentLoading` function.
 *
 * Other collaborators will see an error attachment block when the blob has not finished uploading.
 * This issue can be resolve by sync the upload status through the awareness system in the future.
 *
 * When the attachment is uploaded, the `sourceId` is the id of the blob.
 *
 * If there are no `sourceId` and the `isAttachmentLoading` function returns `false`,
 * it means that the attachment is failed to upload.
 */

/**
 * @deprecated
 */
type BackwardCompatibleUndefined = undefined;

export type AttachmentBlockProps = {
  name: string;
  size: number;
  /**
   * MIME type
   */
  type: string;
  caption?: string;
  // `loadingKey` was used to indicate whether the attachment is loading,
  // which is currently unused but no breaking change is needed.
  // The `loadingKey` and `sourceId` should not be existed at the same time.
  // loadingKey?: string | null;
  sourceId?: string;
  /**
   * Whether to show the attachment as an embed view.
   */
  embed: boolean | BackwardCompatibleUndefined;
};

export const defaultAttachmentProps: AttachmentBlockProps = {
  name: '',
  size: 0,
  type: 'application/octet-stream',
  sourceId: undefined,
  caption: undefined,
  embed: false,
};

export const AttachmentBlockSchema = defineBlockSchema({
  flavour: 'affine:attachment',
  props: (): AttachmentBlockProps => defaultAttachmentProps,
  metadata: {
    version: 1,
    role: 'content',
    parent: ['affine:note'],
  },
  toModel: () => new AttachmentBlockModel(),
});

export class AttachmentBlockModel extends BaseBlockModel<AttachmentBlockProps> {}
