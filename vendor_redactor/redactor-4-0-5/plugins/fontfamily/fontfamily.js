/*jshint esversion: 6 */
Redactor.add('plugin', 'fontfamily', {
    translations: {
        'en': {
            "fontfamily": {
                "title": "Font",
                "remove":  "Remove font family"
            }
        }
    },
    defaults: {
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.0637 3.64888C10.21 3.25857 10.5832 3 11 3H13C13.3973 3 13.7569 3.23519 13.9162 3.59918L20.654 19H21C21.5523 19 22 19.4477 22 20C22 20.5523 21.5523 21 21 21H20.0229C20.008 21.0003 19.993 21.0003 19.9781 21H16.0231C16.008 21.0003 15.9929 21.0003 15.9778 21H14C13.4477 21 13 20.5523 13 20C13 19.4477 13.4477 19 14 19H14.4907L13.2207 16H7.568L6.443 19H7C7.55228 19 8 19.4477 8 20C8 20.5523 7.55228 21 7 21H5.02304C5.00762 21.0004 4.99215 21.0004 4.97666 21H4C3.44772 21 3 20.5523 3 20C3 19.4477 3.44772 19 4 19H4.307L10.0637 3.64888ZM8.318 14H12.3739L10.2231 8.91964L8.318 14ZM11.2433 6.19925L16.6626 19H18.471L12.346 5H11.693L11.2433 6.19925Z"/></svg>'
    },
    init() {
        this.fonts = (this.opts.is('fontfamily.items')) ? this.opts.get('fontfamily.items') : ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'monospace'];
        this.group = 'font';
        this.classes = false;
        if (this.opts.is('fontfamily.classes')) {
            this.classes = true;
            this.fonts = this.opts.get('fontfamily.classes');
            this.opts.set('inlineGroups.' + this.group, this.fonts);
        }
    },
    start() {
        let button = {
            title: this.lang.get('fontfamily.title'),
            icon: this.opts.get('fontfamily.icon'),
            position: { before: 'moreinline' },
            command: 'fontfamily.popup'
        };

        this.app.toolbar.add('fontfamily', button);
        this.app.context.add('fontfamily', button);
    },
    popup(e, button) {
        let buttons = {};
        let selection = this.app.create('selection');
        let inlines = selection.getNodes({ type: 'inline' });
        let $node = false;

        if (inlines.length !== 0) {
            $node = this.dom(inlines[0]);
        }

        for (let i = 0; i < this.fonts.length; i++) {
            let font = this.fonts[i].replace(/'/g, '');
            let obj = {
                title: font.charAt(0).toUpperCase() + font.slice(1),
                command: 'inline.set',
                active: this._isActive(font, $node),
                params: {
                    tag: 'span',
                    style: {
                        'font-family': font
                    }
                }
            };

            if (this.classes) {
                obj.params = { tag: 'span', classname: font, group: 'font' };
            }


            buttons[i] = obj;
        }

        // remove font family
        buttons.remove = {
            position: 'last',
            title: this.lang.get('fontfamily.remove'),
            command: 'fontfamily.remove'
        };


        let dropdown = this.app.create('dropdown', 'fontfamily', { items: buttons });
        this.app.dropdown.open(e, button, dropdown);
    },
    remove() {
        this.app.dropdown.close();

        let obj = { style: 'font-family' };
        if (this.classes) {
            obj = { classname: this.fonts.join(' ') };
        }

        this.app.inline.remove(obj);
    },

    // =private
    _isActive(value, $node) {
        if (this.classes && $node) {
            return $node.hasClass(value);
        }
        else {
            let utils = this.app.create('utils');
            let style = ($node) ? utils.cssToObject($node.attr('style')) : false;

            return (style && style['font-family'] === value);
        }
    }
});