/*jshint esversion: 6 */
Redactor.add('plugin', 'blockcolor', {
    translations: {
        en: {
            "blockcolor": {
                "color": "Color"
            }
        }
    },
    defaults: {
        input: true,
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 6C11.4696 6 10.9609 6.21071 10.5858 6.58579C10.2107 6.96086 10 7.46957 10 8V10H14V8C14 7.46957 13.7893 6.96086 13.4142 6.58579C13.0391 6.21071 12.5304 6 12 6ZM16 8C16 6.93913 15.5786 5.92172 14.8284 5.17157C14.0783 4.42143 13.0609 4 12 4C10.9391 4 9.92172 4.42143 9.17157 5.17157C8.42143 5.92172 8 6.93913 8 8V15C8 15.5523 8.44772 16 9 16C9.55228 16 10 15.5523 10 15V12H14V15C14 15.5523 14.4477 16 15 16C15.5523 16 16 15.5523 16 15V8ZM4 19C4 18.4477 4.44772 18 5 18H19C19.5523 18 20 18.4477 20 19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19Z"/></svg>'
    },
    init() {
        this.colors = (this.opts.is('blockcolor.colors')) ? this.opts.get('blockcolor.colors') : this.opts.get('colors');
    },
    start() {
        let button = {
            icon: this.opts.get('blockcolor.icon'),
            command: 'blockcolor.popup',
            title: '## blockcolor.color ##',
            position: {
                before: ['duplicate', 'trash']
            },
            blocks: {
                all: true,
                except: ['line', 'noneditable']
            }
        };

        this.app.control.add('blockcolor', button);
    },
    popup(e, button) {
        let instance = this.app.block.get();
        let utils = this.app.create('utils');
        let $block = instance.getBlock();
        let style = utils.cssToObject($block.attr('style'));

        let event = this.app.broadcast('blockcolor.get');
        if (event.has('style')) {
            style = event.get('style');
        }

        let picker = this.app.create('colorpicker');
        let $picker = picker.create({
            colors: this.colors,
            input: this.opts.get('blockcolor.input'),
            style: style,
            name: 'color',
            set: 'blockcolor.set',
            remove: 'blockcolor.remove'
        });

        let dropdown = this.app.create('dropdown', 'blockcolor', { html: $picker });
        this.app.dropdown.open(e, button, dropdown);
    },
    set(params) {
        this.app.dropdown.close();
        this.app.editor.restore();

        let event = this.app.broadcast('blockcolor.set', { style: params.style });
        if (event.isStopped()) return;

        let instance = this.app.block.get();
        instance.setStyle(params.style);
    },
    remove() {
        this.app.dropdown.close();
        this.app.editor.restore();

        let instance = this.app.block.get();
        instance.setStyle({ 'color': '' });
    }
});