import { html, render } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { VLine } from '../index.js';
import type { InlineEditor } from '../inline-editor.js';
import type { DeltaInsert } from '../types.js';
import type { DeltaEntry, InlineRange } from '../types.js';
import type { BaseTextAttributes } from '../utils/index.js';
import { deltaInsertsToChunks, renderElement } from '../utils/index.js';

export class DeltaService<TextAttributes extends BaseTextAttributes> {
  constructor(public readonly editor: InlineEditor<TextAttributes>) {}

  get deltas() {
    return this.editor.yText.toDelta() as DeltaInsert<TextAttributes>[];
  }

  get normalizedDeltas() {
    // According to our regulations, the length of each "embed" node should only be 1.
    // Therefore, if the length of an "embed" type node is greater than 1,
    // we will divide it into multiple parts.
    const result: DeltaInsert<TextAttributes>[] = [];
    for (const delta of this.deltas) {
      if (this.editor.isEmbed(delta)) {
        const dividedDeltas = [...delta.insert].map(subInsert => ({
          insert: subInsert,
          attributes: delta.attributes,
        }));
        result.push(...dividedDeltas);
      } else {
        result.push(delta);
      }
    }
    return result;
  }

  mapDeltasInInlineRange = <Result>(
    inlineRange: InlineRange,
    callback: (
      delta: DeltaInsert<TextAttributes>,
      rangeIndex: number,
      deltaIndex: number
    ) => Result,
    normalize = false
  ) => {
    const deltas = normalize ? this.normalizedDeltas : this.deltas;
    const result: Result[] = [];

    deltas.reduce((rangeIndex, delta, deltaIndex) => {
      const length = delta.insert.length;
      const from = inlineRange.index - length;
      const to = inlineRange.index + inlineRange.length;

      const deltaInRange =
        rangeIndex >= from &&
        (rangeIndex < to ||
          (inlineRange.length === 0 && rangeIndex === inlineRange.index));

      if (deltaInRange) {
        const value = callback(delta, rangeIndex, deltaIndex);
        result.push(value);
      }

      return rangeIndex + length;
    }, 0);

    return result;
  };

  isNormalizedDeltaSelected(
    normalizedDeltaIndex: number,
    inlineRange: InlineRange
  ): boolean {
    let result = false;
    if (inlineRange.length >= 1) {
      this.editor.mapDeltasInInlineRange(
        inlineRange,
        (_, rangeIndex, deltaIndex) => {
          if (
            deltaIndex === normalizedDeltaIndex &&
            rangeIndex >= inlineRange.index
          ) {
            result = true;
          }
        },
        // we need to normalize the delta here,
        true
      );
    }

    return result;
  }

  /**
   * Here are examples of how this function computes and gets the delta.
   *
   * We have such a text:
   * ```
   * [
   *   {
   *      insert: 'aaa',
   *      attributes: { bold: true },
   *   },
   *   {
   *      insert: 'bbb',
   *      attributes: { italic: true },
   *   },
   * ]
   * ```
   *
   * `getDeltaByRangeIndex(0)` returns `{ insert: 'aaa', attributes: { bold: true } }`.
   *
   * `getDeltaByRangeIndex(1)` returns `{ insert: 'aaa', attributes: { bold: true } }`.
   *
   * `getDeltaByRangeIndex(3)` returns `{ insert: 'aaa', attributes: { bold: true } }`.
   *
   * `getDeltaByRangeIndex(4)` returns `{ insert: 'bbb', attributes: { italic: true } }`.
   */
  getDeltaByRangeIndex = (rangeIndex: number) => {
    const deltas = this.deltas;

    let index = 0;
    for (const delta of deltas) {
      if (index + delta.insert.length >= rangeIndex) {
        return delta;
      }
      index += delta.insert.length;
    }

    return null;
  };

  /**
   * Here are examples of how this function computes and gets the deltas.
   *
   * We have such a text:
   * ```
   * [
   *   {
   *      insert: 'aaa',
   *      attributes: { bold: true },
   *   },
   *   {
   *      insert: 'bbb',
   *      attributes: { italic: true },
   *   },
   *   {
   *      insert: 'ccc',
   *      attributes: { underline: true },
   *   },
   * ]
   * ```
   *
   * `getDeltasByInlineRange({ index: 0, length: 0 })` returns
   * ```
   * [{ insert: 'aaa', attributes: { bold: true }, }, { index: 0, length: 3, }]]
   * ```
   *
   * `getDeltasByInlineRange({ index: 0, length: 1 })` returns
   * ```
   * [{ insert: 'aaa', attributes: { bold: true }, }, { index: 0, length: 3, }]]
   * ```
   *
   * `getDeltasByInlineRange({ index: 0, length: 4 })` returns
   * ```
   * [{ insert: 'aaa', attributes: { bold: true }, }, { index: 0, length: 3, }],
   *  [{ insert: 'bbb', attributes: { italic: true }, }, { index: 3, length: 3, }]]
   * ```
   *
   * `getDeltasByInlineRange({ index: 3, length: 1 })` returns
   * ```
   * [{ insert: 'aaa', attributes: { bold: true }, }, { index: 0, length: 3, }],
   *  [{ insert: 'bbb', attributes: { italic: true }, }, { index: 3, length: 3, }]]
   * ```
   *
   * `getDeltasByInlineRange({ index: 3, length: 3 })` returns
   * ```
   * [{ insert: 'aaa', attributes: { bold: true }, }, { index: 0, length: 3, }],
   *  [{ insert: 'bbb', attributes: { italic: true }, }, { index: 3, length: 3, }]]
   * ```
   *
   *  `getDeltasByInlineRange({ index: 3, length: 4 })` returns
   * ```
   * [{ insert: 'aaa', attributes: { bold: true }, }, { index: 0, length: 3, }],
   *  [{ insert: 'bbb', attributes: { italic: true }, }, { index: 3, length: 3, }],
   *  [{ insert: 'ccc', attributes: { underline: true }, }, { index: 6, length: 3, }]]
   * ```
   */
  getDeltasByInlineRange = (
    inlineRange: InlineRange
  ): DeltaEntry<TextAttributes>[] => {
    return this.mapDeltasInInlineRange(
      inlineRange,
      (delta, index): DeltaEntry<TextAttributes> => [
        delta,
        { index, length: delta.insert.length },
      ]
    );
  };

  // render current deltas to VLines
  render = async (syncInlineRange = true) => {
    if (!this.editor.mounted) return;

    const rootElement = this.editor.rootElement;

    const normalizedDeltas = this.normalizedDeltas;
    const chunks = deltaInsertsToChunks(normalizedDeltas);

    let normalizedDeltaIndex = 0;
    // every chunk is a line
    const lines = chunks.map(chunk => {
      if (chunk.length > 0) {
        const lineDeltas: [DeltaInsert<TextAttributes>, number][] = [];
        chunk.forEach(delta => {
          lineDeltas.push([delta, normalizedDeltaIndex]);
          normalizedDeltaIndex++;
        });

        const elements: VLine['elements'] = lineDeltas.map(
          ([delta, normalizedDeltaIndex]) => {
            let selected = false;
            const inlineRange = this.editor.getInlineRange();
            if (inlineRange) {
              selected = this.isNormalizedDeltaSelected(
                normalizedDeltaIndex,
                inlineRange
              );
            }

            return [
              renderElement(
                delta,
                this.editor.attributeService.normalizeAttributes,
                selected
              ),
              delta,
            ];
          }
        );

        return html`<v-line .elements=${elements}></v-line>`;
      } else {
        return html`<v-line .elements=${[]}></v-line>`;
      }
    });

    try {
      render(
        repeat(
          lines.map((line, i) => ({ line, index: i })),
          entry => entry.index,
          entry => entry.line
        ),
        rootElement
      );
    } catch (_) {
      // Lit may be crashed by IME input and we need to rerender whole editor for it
      this.editor.rerenderWholeEditor();
      await this.editor.waitForUpdate();
    }

    await this.editor.waitForUpdate();

    if (syncInlineRange) {
      // We need to synchronize the selection immediately after rendering is completed,
      // otherwise there is a possibility of an error in the cursor position
      this.editor.rangeService.syncInlineRange();
    }

    this.editor.slots.updated.emit();
  };
}
