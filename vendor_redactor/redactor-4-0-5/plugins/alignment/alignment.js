/*jshint esversion: 6 */
Redactor.add('plugin', 'alignment', {
    translations: {
        en: {
            "alignment": {
                "alignment": "Alignment",
                "left": "Left",
                "center": "Center",
                "right": "Right",
                "justify": "Justify",
            }
        }
    },
    defaults: {
        context: false,
        items: ['left', 'center', 'right', 'justify'],
        icons: {
            left: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 6C3 5.44772 3.44772 5 4 5H20C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7H4C3.44772 7 3 6.55228 3 6ZM3 12C3 11.4477 3.44772 11 4 11H14C14.5523 11 15 11.4477 15 12C15 12.5523 14.5523 13 14 13H4C3.44772 13 3 12.5523 3 12ZM3 18C3 17.4477 3.44772 17 4 17H18C18.5523 17 19 17.4477 19 18C19 18.5523 18.5523 19 18 19H4C3.44772 19 3 18.5523 3 18Z"/></svg>',
            right: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 6C3 5.44772 3.44772 5 4 5H20C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7H4C3.44772 7 3 6.55228 3 6ZM9 12C9 11.4477 9.44772 11 10 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H10C9.44772 13 9 12.5523 9 12ZM5 18C5 17.4477 5.44772 17 6 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H6C5.44772 19 5 18.5523 5 18Z"/></svg>',
            center: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 6C3 5.44772 3.44772 5 4 5H20C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7H4C3.44772 7 3 6.55228 3 6ZM7 12C7 11.4477 7.44772 11 8 11H16C16.5523 11 17 11.4477 17 12C17 12.5523 16.5523 13 16 13H8C7.44772 13 7 12.5523 7 12ZM5 18C5 17.4477 5.44772 17 6 17H18C18.5523 17 19 17.4477 19 18C19 18.5523 18.5523 19 18 19H6C5.44772 19 5 18.5523 5 18Z"/></svg>',
            justify: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 6C3 5.44772 3.44772 5 4 5H20C20.5523 5 21 5.44772 21 6C21 6.55228 20.5523 7 20 7H4C3.44772 7 3 6.55228 3 6ZM3 12C3 11.4477 3.44772 11 4 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H4C3.44772 13 3 12.5523 3 12ZM3 18C3 17.4477 3.44772 17 4 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H4C3.44772 19 3 18.5523 3 18Z"/></svg>'
        }
    },
    start() {
        let button = {
            icon: this.opts.get('alignment.icons.left'),
            title: '## alignment.alignment ##',
            command: 'alignment.popup',
            position: {
                after: 'format'
            },
            blocks: {
                all: 'editable'
            }
        };

        this.app.toolbar.add('alignment', button);

        if (this.opts.is('alignment.context')) {
            this.app.context.add('alignment', button);
        }
    },
    popup(e, button) {
        let buttons = this.opts.get('alignment.items'),
            currentAlign = this.get(),
            finalButtons = {};

        for (let i = 0; i < buttons.length; i++) {
            let key = buttons[i];
            let item = {
                command: 'alignment.set',
                title: this.lang.get('alignment.' + key),
                active: (currentAlign === key),
                icon: this.opts.get('alignment.icons.' + key),
                params: {
                    name: key
                }
            };

            finalButtons[key] = item;
        }

        let dropdown = this.app.create('dropdown', 'alignment', { items: finalButtons });
        this.app.dropdown.open(e, button, dropdown);
    },
    get() {
        let instance = this.app.block.get();
        let isMultiple = this.app.blocks.is();
        let align;
        let arr = this.opts.get('alignment.items');

        if (isMultiple) {
            align = this._getMultipleInstanceAlign();
        }
        else {
            align = this._getInstanceAlign(instance);
        }

        return align;
    },
    set(params) {
        this.app.dropdown.close();
        this.app.editor.restore();

        // get data
        let instance = this.app.block.get(),
            isMultiple = this.app.blocks.is();

        if (isMultiple) {
            this._setMultiplInstanceAlign(params);
        }
        else {
           this._setInstanceAlign(instance, params);
        }
    },

    // =private
    _setMultiplInstanceAlign(params) {
        let blocks = this.app.blocks.get({ selected: true, editable: true, instances: true });

        for (let i = 0; i < blocks.length; i++) {
            this._setInstanceAlign(blocks[i], params);
        }
    },
    _setInstanceAlign(instance, params) {
        if (!instance) return;
        instance.setStyle({ 'text-align': '' });
        this._setAlign(instance, params);
    },
    _setAlign(instance, params) {
        if ((this.opts.get('dir') === 'ltr' && params.name !== 'left') || (this.opts.get('dir') === 'rtl' && params.name !== 'right')) {
            instance.setStyle({ 'text-align': params.name });
        }
    },
    _getMultipleInstanceAlign() {
        let align = { left: 0, center: 0, right: 0, justify: 0 };
        let $blocks = this.app.blocks.get({ selected: true, editable: true });
        let size = $blocks.length;
        let all = 0;

        $blocks.each(function($node) {
            let key = $node.css('text-align');
            if (Object.hasOwn(align, key)) {
                align[key]++;
            }
        });

        for (let [key, value] of Object.entries(align)) {
            if (value === size) {
                return key;
            }
            if (value === 0) {
                all++;
            }
        }

        if (all === Object.keys(align).length) {
            return 'left';
        }

        return false;
    },
    _getInstanceAlign(instance) {
        if (!instance) {
            return;
        }

        let $block = instance.getBlock();
        let currentAlign = $block.css('text-align');

        return (currentAlign) ? currentAlign : align;
    }
});