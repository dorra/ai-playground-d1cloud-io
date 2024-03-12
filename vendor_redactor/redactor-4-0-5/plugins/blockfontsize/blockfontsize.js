/*jshint esversion: 6 */
Redactor.add('plugin', 'blockfontsize', {
    translations: {
        en: {
            "blockfontsize": {
                "text-size": "Text size",
                "line-height": "Line height",
                "eg": "e.g."
            }
        }
    },
    defaults: {
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2 5C2 4.44772 2.44772 4 3 4H16C16.5523 4 17 4.44772 17 5V7C17 7.55228 16.5523 8 16 8C15.4477 8 15 7.55228 15 7V6H11V18H12C12.5523 18 13 18.4477 13 19C13 19.5523 12.5523 20 12 20H8C7.44772 20 7 19.5523 7 19C7 18.4477 7.44772 18 8 18H9V6H4V7C4 7.55228 3.55228 8 3 8C2.44772 8 2 7.55228 2 7V5ZM14 12C14 11.4477 14.4477 11 15 11H21C21.5523 11 22 11.4477 22 12V13C22 13.5523 21.5523 14 21 14C20.4477 14 20 13.5523 20 13H19V18C19.5523 18 20 18.4477 20 19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19C16 18.4477 16.4477 18 17 18V13H16C16 13.5523 15.5523 14 15 14C14.4477 14 14 13.5523 14 13V12Z"/></svg>'
    },
    start() {
        let button = {
            icon: this.opts.get('blockfontsize.icon'),
            command: 'blockfontsize.popup',
            title: '## blockfontsize.text-size ##',
            position: {
                before: ['duplicate', 'trash']
            },
            blocks: {
                types: ['text', 'heading', 'list', 'pre', 'wrapper']
            }
        };

        this.app.control.add('blockfontsize', button);
    },
    popup(e, button) {
        let instance = this.app.block.get();
        let css = instance.getStyle();

        let data = {
            size: (css) ? parseInt(css['font-size']) : '16',
            line: (css) ? css['line-height'] : '1.5'
        };

        let event = this.app.broadcast('blockfontsize.get');
        if (event.has('data')) {
            data = event.get('data');
        }

        let form = this.app.create('form');
        form.create({
            title: '## blockfontsize.text-size ##',
            data: data,
            setter: 'blockfontsize.save',
            items: {
                size: { type: 'number', width: '90px', label: '## blockfontsize.text-size ##', hint: '## blockfontsize.eg ## 16' },
                line: { type: 'input', width: '90px', label: '## blockfontsize.line-height ##', hint: '## blockfontsize.eg ## 1.5' }
            }
        });
        form.setData(data);

        let dropdown = this.app.create('dropdown', 'blockfontsize', { html: form.getElement() });
        this.app.dropdown.open(e, button, dropdown);
    },
    save(form) {
        let instance = this.app.block.get();
        let data = form.getData();

        let event = this.app.broadcast('blockfontsize.set', { data: data });
        if (event.isStopped()) return;

        instance.setStyle({ 'font-size': data.size + 'px', 'line-height': data.line });
    }
});