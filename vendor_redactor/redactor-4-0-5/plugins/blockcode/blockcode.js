/*jshint esversion: 6 */
Redactor.add('plugin', 'blockcode', {
    translations: {
        en: {
            "blockcode": {
                "edit-code": "Edit Code"
            }
        }
    },
    modals: {
        edit: {
            width: '100%',
            title: '## blockcode.edit-code ##',
            form: {
                'code': { type: 'textarea', rows: '8' }
            },
            footer: {
                save: { title: '## buttons.save ##', command: 'blockcode.save', type: 'primary' },
                cancel: { title: '## buttons.cancel ##', command: 'modal.close' }
            }
        }
    },
    defaults: {
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.2425 3.02986C14.7783 3.16381 15.1041 3.70674 14.9701 4.24254L10.9701 20.2425C10.8362 20.7783 10.2933 21.1041 9.75746 20.9701C9.22167 20.8362 8.89591 20.2933 9.02986 19.7575L13.0299 3.75746C13.1638 3.22167 13.7067 2.89591 14.2425 3.02986ZM7.70711 7.29289C8.09763 7.68342 8.09763 8.31658 7.70711 8.70711L4.41421 12L7.70711 15.2929C8.09763 15.6834 8.09763 16.3166 7.70711 16.7071C7.31658 17.0976 6.68342 17.0976 6.29289 16.7071L2.29289 12.7071C1.90237 12.3166 1.90237 11.6834 2.29289 11.2929L6.29289 7.29289C6.68342 6.90237 7.31658 6.90237 7.70711 7.29289ZM16.2929 7.29289C16.6834 6.90237 17.3166 6.90237 17.7071 7.29289L21.7071 11.2929C22.0976 11.6834 22.0976 12.3166 21.7071 12.7071L17.7071 16.7071C17.3166 17.0976 16.6834 17.0976 16.2929 16.7071C15.9024 16.3166 15.9024 15.6834 16.2929 15.2929L19.5858 12L16.2929 8.70711C15.9024 8.31658 15.9024 7.68342 16.2929 7.29289Z"/></svg>'
    },
    init() {
        this.offset = false;
    },
    start() {
        let button = {
            icon: this.opts.get('blockcode.icon'),
            command: 'blockcode.edit',
            title: '## blockcode.edit-code ##',
            position: {
                before: ['duplicate', 'trash']
            }
        };

        this.app.control.add('blockcode', button);
    },
    edit(e, button) {
        let instance = this.app.block.get(),
            code = instance.getOuterHtml(),
            offset = this.app.create('offset'),
            unparser = this.app.create('unparser');

        // unparse code
        code = unparser.unparse(code);

        if (instance.isEditable()) {
            this.offset = offset.get(instance.getBlock());
        }

        // create
        let stack = this.app.create('stack');
        stack.create('blockcode', this.modals.edit);
        stack.setData({ code: code });

        // open
        this.app.modal.open({ name: 'blockcode', stack: stack, focus: 'code', button: button });

        // hadnle & codemirror
        this._buildInputHandle(stack);
        this._buildCodemirror(stack);
    },
    save(stack) {
        this.app.modal.close();

        let instance = this.app.block.get(),
            code = this._getCode(stack),
            offset = this.app.create('offset'),
            parser = this.app.create('parser');

        if (code === '') {
            return;
        }

        // create
        code = parser.parse(code, { type: 'html' });

        let $source = this.dom(code),
            newInstance = this.app.create('block.' + instance.getType(), $source);

        // change
        instance.change(newInstance);

        // set editable focus
        if (this.offset && newInstance.isEditable()) {
            offset.set(this.offset, newInstance.getBlock());
        }

        // clear offset
        this.offset = false;
    },

    // private
    _getCode(stack) {
        let data = stack.getData(),
            code = data.code.trim();

        return this.app.codemirror.val(code);
    },
    _buildInputHandle(stack) {
        let $input = stack.getInput('code');
        $input.on('keydown', this.app.input.handleTextareaTab.bind(this));
    },
    _buildCodemirror(stack) {
        let $input = stack.getInput('code');

        this.app.codemirror.create({ el: $input, height: '200px', focus: true });
        this.app.modal.updatePosition();
    }
});