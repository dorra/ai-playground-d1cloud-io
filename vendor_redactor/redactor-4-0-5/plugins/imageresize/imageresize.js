/*jshint esversion: 6 */
Redactor.add('plugin', 'imageresize', {
    translations: {
        en: {
            "imageresize": {
                "image-resize": "Image resize"
            }
        }
    },
    defaults: {
        minHeight: 20,
        minWidth: 100,
        zIndex: 96
    },
    subscribe: {
        'editor.blur, editor.select': function() {
            this.stop();
        },
        'image.position': function() {
            this._setResizerPosition();
        },
        'block.set': function(event) {
            this._load();
        },
        'source.before.open': function() {
            this._hide();
        },
        'image.outset, image.wrap, fullscreen.open, fullscreen.close': function() {
            this.updatePosition();
        }
    },
    stop() {
        this._remove();
        this._stopEvents();
    },
    updatePosition() {
        this._setResizerPosition();
    },

    // private
    _load() {
        let instance = this.app.block.get();

        // remove resizer
        this._remove();

        if (instance && instance.isType('image')) {
            this._build(instance);
        }
    },
    _build(instance) {
        this.$block = instance.getBlock();
        this.$image = instance.getImage();

        // create
        this.resizer = this.dom('<span>');
        this.resizer.attr('id', 'rx-image-resizer');
        this.resizer.css({
            'position': 'absolute',
            'background-color': '#046BFB',
            'min-width': '8px',
            'min-height': '22px',
            'padding': '3px 4px',
            'border-radius': '2px',
            'font-size': '12px',
            'line-height': '1',
            'border-radius': '4px',
            'color': '#fff',
            'border': '2px solid #fff',
            'cursor': 'move',
            'cursor': 'ew-resize'
        });

        this.app.$body.append(this.resizer);
        this._setResizerPosition();
        setTimeout(this._setResizerPosition.bind(this), 30);

        this._buildWidth();
        this._buildDepth();
        this._buildEvents();

        this.resizer.on('mousedown touchstart', this._press.bind(this));
    },
    _buildDepth() {
        this.resizer.css('z-index', this.opts.get('imageresize.zIndex'));

        if (this.opts.is('bsmodal')) {
            this.resizer.css('z-index', 1061);
        }
        if (this.app.isProp('fullscreen')) {
            this.resizer.css('z-index', 10001);
        }
    },
    _setResizerPosition() {
        if (!this.$image) return;

        let offsetFix = -8;
        let pos = this.$image.offset();
        let width = this.$image.width();
        let height = this.$image.height();
        let resizerWidth =  this.resizer.width();
        let resizerHeight =  this.resizer.height();

        function getOffsetWithinFixedDiv(pos, element, fixedDiv) {
            if (fixedDiv.style.position !== 'fixed') {
                return pos;
            }

            const elementRect = element.getBoundingClientRect();
            const divRect = fixedDiv.getBoundingClientRect();
            const offsetTop = elementRect.top + window.scrollY - divRect.top;
            const offsetLeft = elementRect.left + window.scrollX - divRect.left;

            return { top: offsetTop, left: offsetLeft };
        }

        if (this.app.scroll.isTarget()) {
            pos = getOffsetWithinFixedDiv(pos, this.$image.get(), this.app.scroll.getTarget().get());
        }

        let top = Math.round(pos.top + (height/2) - (resizerHeight/2));

        this._buildDepth();
        this.resizer.css({
            top: top + 'px',
            left: Math.round(pos.left + width - resizerWidth - offsetFix) + 'px'
        });
        this.resizer.show();

        // scroll target top/bottom hide
        if (this.app.scroll.isTarget()) {
            let $target = this.app.scroll.getTarget(),
                targetBottom = $target.offset().top + $target.height(),
                targetTop = $target.offset().top,
                bottom = top + this.resizer.height(),
                targetTolerance = parseInt($target.css('padding-top'));

            if (bottom > targetBottom || (targetTop + targetTolerance) > top) {
                this.resizer.hide();
            }
        }

        // editor top/bottom hide
        if (this.opts.is('maxHeight')) {
            let $editor = this.app.editor.getEditor();
            let editorBottom = $editor.offset().top + $editor.height();
            let editorTop = $editor.offset().top;
            let checkBottom = top + this.resizer.height();

            if (checkBottom > editorBottom || editorTop > top) {
                this.resizer.hide();
            }
        }
    },
    _press(e) {
        e.preventDefault();

        let h = this.$image.height(),
            w = this.$image.width();

        this.resizeHandle = {
            x : e.pageX,
            y : e.pageY,
            el : this.$image,
            ratio: w / h,
            h: h,
            w: w
        };

        this.app.event.pause();
        this.app.getDoc().on('mousemove.rx-image-resize touchmove.rx-image-resize', this._move.bind(this));
        this.app.getDoc().on('mouseup.rx-image-resize touchend.rx-image-resize', this._release.bind(this));
        this.app.broadcast('image.resize.start', { e: e, block: this.$block, image: this.$image });
    },
    _buildEvents() {
        let $target = this.app.scroll.getTarget();
        $target.on('resize.rx-image-resize', this.updatePosition.bind(this));
        $target.on('scroll.rx-image-resize', this.updatePosition.bind(this));
        this.app.editor.getEditor().on('scroll.rx-image-resize', this.updatePosition.bind(this));
    },
    _buildWidth() {
        let utils = this.app.create('utils');
        let css = utils.cssToObject(this.$image.attr('style'));
        if (css.width || css.height) {
            this._width = true;
        }
    },
    _move(e) {
        e.preventDefault();

        let width = this._getWidth(e),
            height = width / this.resizeHandle.ratio,
            $el = this.resizeHandle.el,
            o = this.opts.get('imageresize');

        height = Math.round(height);
        width = Math.round(width);

        if (height < o.minHeight || width < o.minWidth) return;
        if (this._getResizableBoxWidth() <= width) return;

        $el.attr({ width: width, height: height });
        if (this._width) {
            $el.css({ width: width + 'px', height: height + 'px' });
        }

        this.resizer.text(width + 'px');

        this._setResizerPosition();
        this.app.control.updatePosition();

        // broadcast
        this.app.broadcast('image.resize.move', { e: e, block: this.$block, image: this.$image });
    },
    _release(e) {
        let cleaner = this.app.create('cleaner');
        cleaner.cacheElementStyle(this.$image);

        this._stopEvents();
        this.app.block.set(this.$block);
        setTimeout(function() {
            this.app.event.run();
        }.bind(this), 10);

        this.resizer.text('');
        this._setResizerPosition();

        // broadcast
        this.app.broadcast('image.resize.stop', { e: e, block: this.$block, image: this.$image });
    },
    _stopEvents() {
        this.app.getDoc().off('.rx-image-resize');
        this.app.editor.getEditor().off('.rx-image-resize');
    },
    _hide() {
        this.app.$body.find('#rx-image-resizer').hide();
    },
    _show() {
        this.app.$body.find('#rx-image-resizer').show();
    },
    _remove() {
        this.app.$body.find('#rx-image-resizer').remove();
    },
    _getWidth(e) {
        let width = this.resizeHandle.w;
        if (e.targetTouches) {
            width += (e.targetTouches[0].pageX -  this.resizeHandle.x);
        }
        else {
            width += (e.pageX - this.resizeHandle.x);
        }

        return width;
    },
    _getResizableBoxWidth() {
        let $el = this.app.editor.getEditor(),
            width = $el.width();

        return width - parseInt($el.css('padding-left')) - parseInt($el.css('padding-right'));
    }
});