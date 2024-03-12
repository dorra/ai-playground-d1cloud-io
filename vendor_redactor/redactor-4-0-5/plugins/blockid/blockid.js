/*jshint esversion: 6 */
Redactor.add('plugin', 'blockid', {
    translations: {
        en: {
            "blockid": {
                "id": "ID"
            }
        }
    },
    defaults: {
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 5C5.73478 5 5.48043 5.10536 5.29289 5.29289C5.10536 5.48043 5 5.73478 5 6V18C5 18.2652 5.10536 18.5196 5.29289 18.7071C5.48043 18.8946 5.73478 19 6 19H18C18.2652 19 18.5196 18.8946 18.7071 18.7071C18.8946 18.5196 19 18.2652 19 18V6C19 5.73478 18.8946 5.48043 18.7071 5.29289C18.5196 5.10536 18.2652 5 18 5H6ZM3.87868 3.87868C4.44129 3.31607 5.20435 3 6 3H18C18.7956 3 19.5587 3.31607 20.1213 3.87868C20.6839 4.44129 21 5.20435 21 6V18C21 18.7957 20.6839 19.5587 20.1213 20.1213C19.5587 20.6839 18.7957 21 18 21H6C5.20435 21 4.44129 20.6839 3.87868 20.1213C3.31607 19.5587 3 18.7956 3 18V6C3 5.20435 3.31607 4.44129 3.87868 3.87868ZM10 7C10.5523 7 11 7.44772 11 8V9H13V8C13 7.44772 13.4477 7 14 7C14.5523 7 15 7.44772 15 8V9H16C16.5523 9 17 9.44772 17 10C17 10.5523 16.5523 11 16 11H15V13H16C16.5523 13 17 13.4477 17 14C17 14.5523 16.5523 15 16 15H15V16C15 16.5523 14.5523 17 14 17C13.4477 17 13 16.5523 13 16V15H11V16C11 16.5523 10.5523 17 10 17C9.44772 17 9 16.5523 9 16V15H8C7.44772 15 7 14.5523 7 14C7 13.4477 7.44772 13 8 13H9V11H8C7.44772 11 7 10.5523 7 10C7 9.44772 7.44772 9 8 9H9V8C9 7.44772 9.44772 7 10 7ZM11 11V13H13V11H11Z"/></svg>'
    },
    modals: {
        edit: {
            width: '100%',
            title: '## blockid.id ##',
            form: {
                'id': { type: 'input' }
            },
            footer: {
                save: { title: '## buttons.save ##', command: 'blockid.save', type: 'primary' },
                cancel: { title: '## buttons.cancel ##', command: 'modal.close' }
            }
        }
    },
    start() {
        let button = {
            icon: this.opts.get('blockid.icon'),
            command: 'blockid.popup',
            title: '## blockid.id ##',
            position: {
                before: ['duplicate', 'trash']
            }
        };

        this.app.control.add('blockid', button);
    },
    popup(e, button) {
        let instance = this.app.block.get();
        let id = instance.getId();

        // create
        let stack = this.app.create('stack');
        stack.create('blockid', this.modals.edit);
        stack.setData({ id: id });

        // open
        this.app.modal.open({ name: 'blockid', stack: stack, focus: 'id', button: button });
    },
    save(stack) {
        this.app.modal.close();

        let id = stack.getData('id');
        let instance = this.app.block.get();
        instance.setId(id);
    }
});