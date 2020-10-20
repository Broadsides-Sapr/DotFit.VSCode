/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/base/common/event';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { Dimension } from 'vs/base/browser/dom';
import { Orientation, Sash } from 'vs/base/browser/ui/sash/sash';


export interface IResizeEvent {
	dimenion: Dimension;
	done: boolean;
}

export class ResizableHTMLElement {

	readonly domNode: HTMLElement;

	private readonly _onDidWillResize = new Emitter<void>();
	readonly onDidWillResize: Event<void> = this._onDidWillResize.event;

	private readonly _onDidResize = new Emitter<IResizeEvent>();
	readonly onDidResize: Event<IResizeEvent> = this._onDidResize.event;

	private readonly _eastSash: Sash;
	private readonly _southSash: Sash;
	private readonly _sashListener = new DisposableStore();

	private _size = new Dimension(0, 0);
	private _minSize = new Dimension(0, 0);
	private _maxSize = new Dimension(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
	private _preferredSize?: Dimension;

	constructor() {
		this.domNode = document.createElement('div');
		this._eastSash = new Sash(this.domNode, { getVerticalSashLeft: () => this._size.width }, { orientation: Orientation.VERTICAL });
		this._southSash = new Sash(this.domNode, { getHorizontalSashTop: () => this._size.height }, { orientation: Orientation.HORIZONTAL });

		this._eastSash.orthogonalEndSash = this._southSash;
		this._southSash.orthogonalEndSash = this._eastSash;

		let currentSize: Dimension | undefined;
		let deltaY = 0;
		let deltaX = 0;

		this._sashListener.add(Event.any(this._eastSash.onDidStart, this._southSash.onDidStart)(() => {
			if (currentSize === undefined) {
				this._onDidWillResize.fire();
				currentSize = this._size;
				deltaY = 0;
				deltaX = 0;
			}
		}));
		this._sashListener.add(Event.any(this._eastSash.onDidEnd, this._southSash.onDidEnd)(() => {
			if (currentSize !== undefined) {
				currentSize = undefined;
				deltaY = 0;
				deltaX = 0;
				this._onDidResize.fire({ dimenion: this._size, done: true });
			}
		}));

		this._sashListener.add(this._eastSash.onDidChange(e => {
			if (currentSize) {
				deltaX = e.currentX - e.startX;
				this.layout(currentSize.height + deltaY, currentSize.width + deltaX);
				this._onDidResize.fire({ dimenion: this._size, done: false });
			}
		}));
		this._sashListener.add(this._southSash.onDidChange(e => {
			if (currentSize) {
				deltaY = e.currentY - e.startY;
				this.layout(currentSize.height + deltaY, currentSize.width + deltaX);
				this._onDidResize.fire({ dimenion: this._size, done: false });
			}
		}));

		this._sashListener.add(this._eastSash.onDidReset(e => {
			if (this._preferredSize) {
				this.layout(this._size.height, this._preferredSize.width);
				this._onDidResize.fire({ dimenion: this._size, done: true });
			}
		}));
		this._sashListener.add(this._southSash.onDidReset(e => {
			if (this._preferredSize) {
				this.layout(this._preferredSize.height, this._size.width);
				this._onDidResize.fire({ dimenion: this._size, done: true });
			}
		}));
	}

	dispose(): void {
		this._southSash.dispose();
		this._eastSash.dispose();
		this._sashListener.dispose();
		this.domNode.remove();
	}

	layout(height: number = this.size.height, width: number = this.size.width): void {

		const { height: minHeight, width: minWidth } = this._minSize;
		const { height: maxHeight, width: maxWidth } = this._maxSize;

		height = Math.max(minHeight, Math.min(maxHeight, height));
		width = Math.max(minWidth, Math.min(maxWidth, width));

		const newSize = new Dimension(width, height);
		if (!Dimension.equals(newSize, this._size)) {
			this.domNode.style.height = height + 'px';
			this.domNode.style.width = width + 'px';
			this._size = newSize;
			this._southSash.layout();
			this._eastSash.layout();
		}
	}

	get size() {
		return this._size;
	}

	set maxSize(value: Dimension) {
		this._maxSize = value;
	}

	get maxSize() {
		return this._maxSize;
	}

	set minSize(value: Dimension) {
		this._minSize = value;
	}

	get minSize() {
		return this._minSize;
	}

	set preferredSize(value: Dimension | undefined) {
		this._preferredSize = value;
	}

	get preferredSize() {
		return this._preferredSize;
	}

}
