/*jshint esversion: 6 */
Redactor.add('plugin', 'textdirection', {
    translations: {
        en: {
            "textdirection": {
                "title": "RTL-LTR",
                "ltr": "Left to Right",
                "rtl": "Right to Left"
            }
        }
    },
    defaults: {
        context: false,
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.31802 4.31802C7.16193 3.47411 8.30653 3 9.5 3H16C16.5523 3 17 3.44772 17 4C17 4.55228 16.5523 5 16 5H15V15C15 15.5523 14.5523 16 14 16C13.4477 16 13 15.5523 13 15V5H11V15C11 15.5523 10.5523 16 10 16C9.44772 16 9 15.5523 9 15V11.9722C7.99049 11.8593 7.04323 11.4072 6.31802 10.682C5.47411 9.83807 5 8.69347 5 7.5C5 6.30653 5.47411 5.16193 6.31802 4.31802ZM9 9.9495V5.0505C8.52328 5.14782 8.08142 5.38304 7.73223 5.73223C7.26339 6.20107 7 6.83696 7 7.5C7 8.16304 7.26339 8.79893 7.73223 9.26777C8.08142 9.61696 8.52328 9.85218 9 9.9495ZM16.2929 17.7071C15.9024 17.3166 15.9024 16.6834 16.2929 16.2929C16.6834 15.9024 17.3166 15.9024 17.7071 16.2929L19.7071 18.2929C20.0976 18.6834 20.0976 19.3166 19.7071 19.7071L17.7071 21.7071C17.3166 22.0976 16.6834 22.0976 16.2929 21.7071C15.9024 21.3166 15.9024 20.6834 16.2929 20.2929L16.5858 20H5C4.44772 20 4 19.5523 4 19C4 18.4477 4.44772 18 5 18H16.5858L16.2929 17.7071Z"/></svg>'
    },
    start() {
        let button = {
            title: '## textdirection.title ##',
            icon: this.opts.get('textdirection.icon'),
            command: 'textdirection.popup',
            position: {
                after: 'format'
            },
            blocks: {
                all: 'editable',
                except: ['pre']
            }
        };

        this.app.toolbar.add('textdirection', button);

        if (this.opts.is('textdirection.context')) {
            this.app.context.add('textdirection', button);
        }
    },
    popup(e, button) {
        let items = {
            ltr: { title: '## textdirection.ltr ##', command: 'textdirection.set' },
            rtl: { title: '## textdirection.rtl ##', command: 'textdirection.set' },
        };
        let dir = this._get();

        items[dir].active = true;

        let dropdown = this.app.create('dropdown', 'textdirection', { items: items });
        this.app.dropdown.open(e, button, dropdown);
    },
    set(params, item, name) {
        this.app.dropdown.close();

        let instance = this.app.block.get();
        let dir = this.opts.get('dir');

        if (this.app.blocks.is()) {
            let $blocks = this.app.blocks.get({ selected: true, editable: true });
            $blocks.each(function($node) {
                this._set($node, dir, name);
            }.bind(this));
        }
        else if (instance) {
            let $block = instance.getBlock();
            this._set($block, dir, name);
        }
    },

    // =private
    _set($block, dir, name) {
        if (dir === name) {
            $block.removeAttr('dir');
        }
        else {
            $block.attr('dir', name);
        }
    },
    _get() {
        let instance = this.app.block.get();
        let dir = this.opts.get('dir');
        let dirs = {
           ltr: 0,
           rtl: 0
        };

        if (this.app.blocks.is()) {
            let $blocks = this.app.blocks.get({ selected: true, editable: true });
            let size = $blocks.length;
            $blocks.each(function($node) {
                let val = $node.attr('dir');
                if (val) {
                    dirs[val]++;
                }
            }.bind(this));

            let all = 0;
            for (let [key, value] of Object.entries(dirs)) {
                if (value === size) {
                    return key;
                }
                if (value === 0) {
                    all++;
                }
            }

            if (all === Object.keys(dirs).length) {
                return dir;
            }
        }
        else if (instance) {
            let $block = instance.getBlock();
            dir = $block.attr('dir');
        }

        return dir;
    }
});