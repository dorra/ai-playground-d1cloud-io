/*jshint esversion: 6 */
Redactor.add('plugin', 'fontcolor', {
    translations: {
        'en': {
            "fontcolor": {
                "title": "Text color"
            }
        }
    },
    defaults: {
        input: true,
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 6C11.4696 6 10.9609 6.21071 10.5858 6.58579C10.2107 6.96086 10 7.46957 10 8V10H14V8C14 7.46957 13.7893 6.96086 13.4142 6.58579C13.0391 6.21071 12.5304 6 12 6ZM16 8C16 6.93913 15.5786 5.92172 14.8284 5.17157C14.0783 4.42143 13.0609 4 12 4C10.9391 4 9.92172 4.42143 9.17157 5.17157C8.42143 5.92172 8 6.93913 8 8V15C8 15.5523 8.44772 16 9 16C9.55228 16 10 15.5523 10 15V12H14V15C14 15.5523 14.4477 16 15 16C15.5523 16 16 15.5523 16 15V8ZM4 19C4 18.4477 4.44772 18 5 18H19C19.5523 18 20 18.4477 20 19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19Z"/></svg>'
    },
    init() {
        this.colors = (this.opts.is('fontcolor.colors')) ? this.opts.get('fontcolor.colors') : this.opts.get('colors');
        this.group = 'color';
        this.classes = false;
        if (this.opts.is('fontcolor.classes')) {
            this.classes = true;
            this.colors = this.opts.get('fontcolor.classes');
            this.opts.set('inlineGroups.' + this.group, this.colors);
        }
    },
    start() {
        let button = {
            title: this.lang.get('fontcolor.title'),
            color: true,
            icon: this.opts.get('fontcolor.icon'),
            position: { before: 'moreinline' },
            command: 'fontcolor.popup'
        };

        this.app.toolbar.add('fontcolor', button);
        this.app.context.add('fontcolor', button);
    },
    popup(e, button) {
        let dropdown = (this.classes) ? this._createClassesPopup() : this._createPopup();

        this.app.dropdown.open(e, button, dropdown);
    },
    set(params) {
        this.app.editor.restore();
        this.app.inline.set(params);
    },
    remove() {
        this._remove('color');
    },
    removeBackground() {
        this._remove('background');
    },

    // =private
    _createClassesPopup() {
        let buttons = this._createButtons();
        buttons = this._addRemoveButton(buttons);

        return this.app.create('dropdown', 'fontcolor', { items: buttons });
    },
    _createPopup() {
        let selection = this.app.create('selection'),
            utils = this.app.create('utils'),
            inlines = selection.getNodes({ type: 'inline', link: true, buttons: true }),
            $node = false;

        if (inlines.length !== 0) {
            $node = this.dom(inlines[0]);
        }

        let style = {};
        if ($node) {
            style = utils.cssToObject($node.attr('style'));
        }

        let picker = this.app.create('colorpicker');
        let $picker = picker.create({
            colors: this.colors,
            input: this.opts.get('fontcolor.input'),
            style: style,
            tabs: ['color', 'background'],
            set: 'fontcolor.set',
            remove: {
                color: 'fontcolor.remove',
                background: 'fontcolor.removeBackground'
            }
        });

        return this.app.create('dropdown', 'fontcolor', { html: $picker });
    },
    _createButtons(type) {
        let buttons = {};
        for (let i = 0; i < this.colors.length; i++) {
            let color = this.colors[i];
            let style = (type === 'color') ? { 'color': color } : { 'background': color };
            let params = { tag: 'span', style: style };

            if (this.classes) {
                params = { tag: 'span', classname: color, group: 'color' };
            }
            let obj = {
                title: color,
                color: (type) ? color : false,
                swatch: (type) ? true : false,
                command: 'inline.set',
                params: params
            };

            buttons[i] = obj;
        }

        return buttons;
    },
    _addRemoveButton(buttons, type) {
        buttons.remove = this._createRemoveButton(type);
        return buttons;
    },
    _remove(type) {
        this.app.dropdown.close();

        let obj = (type === 'color') ? { style: 'color' } : { style: 'background' };
        if (this.classes) {
            obj = { classname: this.colors.join(' ') };
        }

        this.app.inline.remove(obj);
    }
});