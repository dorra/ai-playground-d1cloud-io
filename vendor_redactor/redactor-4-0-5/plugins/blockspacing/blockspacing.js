/*jshint esversion: 6 */
Redactor.add('plugin', 'blockspacing', {
    translations: {
        en: {
            "blockspacing": {
                "spacing": "Spacing",
                "padding": "Padding"
            }
        }
    },
    defaults: {
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 3C4.55228 3 5 3.44772 5 4V4.01C5 4.56229 4.55228 5.01 4 5.01C3.44772 5.01 3 4.56229 3 4.01V4C3 3.44772 3.44772 3 4 3ZM8 3C8.55228 3 9 3.44772 9 4V4.01C9 4.56229 8.55228 5.01 8 5.01C7.44772 5.01 7 4.56229 7 4.01V4C7 3.44772 7.44772 3 8 3ZM12 3C12.5523 3 13 3.44772 13 4V4.01C13 4.56229 12.5523 5.01 12 5.01C11.4477 5.01 11 4.56229 11 4.01V4C11 3.44772 11.4477 3 12 3ZM16 3C16.5523 3 17 3.44772 17 4V4.01C17 4.56229 16.5523 5.01 16 5.01C15.4477 5.01 15 4.56229 15 4.01V4C15 3.44772 15.4477 3 16 3ZM20 3C20.5523 3 21 3.44772 21 4V4.01C21 4.56229 20.5523 5.01 20 5.01C19.4477 5.01 19 4.56229 19 4.01V4C19 3.44772 19.4477 3 20 3ZM4 7C4.55228 7 5 7.44772 5 8V8.01C5 8.56228 4.55228 9.01 4 9.01C3.44772 9.01 3 8.56228 3 8.01V8C3 7.44772 3.44772 7 4 7ZM7 8C7 7.44772 7.44772 7 8 7H16C16.5523 7 17 7.44772 17 8V16C17 16.5523 16.5523 17 16 17H8C7.44772 17 7 16.5523 7 16V8ZM9 9V15H15V9H9ZM20 7C20.5523 7 21 7.44772 21 8V8.01C21 8.56228 20.5523 9.01 20 9.01C19.4477 9.01 19 8.56228 19 8.01V8C19 7.44772 19.4477 7 20 7ZM4 11C4.55228 11 5 11.4477 5 12V12.01C5 12.5623 4.55228 13.01 4 13.01C3.44772 13.01 3 12.5623 3 12.01V12C3 11.4477 3.44772 11 4 11ZM20 11C20.5523 11 21 11.4477 21 12V12.01C21 12.5623 20.5523 13.01 20 13.01C19.4477 13.01 19 12.5623 19 12.01V12C19 11.4477 19.4477 11 20 11ZM4 15C4.55228 15 5 15.4477 5 16V16.01C5 16.5623 4.55228 17.01 4 17.01C3.44772 17.01 3 16.5623 3 16.01V16C3 15.4477 3.44772 15 4 15ZM20 15C20.5523 15 21 15.4477 21 16V16.01C21 16.5623 20.5523 17.01 20 17.01C19.4477 17.01 19 16.5623 19 16.01V16C19 15.4477 19.4477 15 20 15ZM4 19C4.55228 19 5 19.4477 5 20V20.01C5 20.5623 4.55228 21.01 4 21.01C3.44772 21.01 3 20.5623 3 20.01V20C3 19.4477 3.44772 19 4 19ZM8 19C8.55228 19 9 19.4477 9 20V20.01C9 20.5623 8.55228 21.01 8 21.01C7.44772 21.01 7 20.5623 7 20.01V20C7 19.4477 7.44772 19 8 19ZM12 19C12.5523 19 13 19.4477 13 20V20.01C13 20.5623 12.5523 21.01 12 21.01C11.4477 21.01 11 20.5623 11 20.01V20C11 19.4477 11.4477 19 12 19ZM16 19C16.5523 19 17 19.4477 17 20V20.01C17 20.5623 16.5523 21.01 16 21.01C15.4477 21.01 15 20.5623 15 20.01V20C15 19.4477 15.4477 19 16 19ZM20 19C20.5523 19 21 19.4477 21 20V20.01C21 20.5623 20.5523 21.01 20 21.01C19.4477 21.01 19 20.5623 19 20.01V20C19 19.4477 19.4477 19 20 19Z"/></svg>'
    },
    start() {
        let button = {
            icon: this.opts.get('blockspacing.icon'),
            command: 'blockspacing.popup',
            title: '## blockspacing.spacing ##',
            position: {
                before: ['duplicate', 'trash']
            },
            blocks: {
                all: true,
                except: ['line', 'noneditable']
            }
        };

        this.app.control.add('blockspacing', button);
    },
    popup(e, button) {
        let instance = this.app.block.get();
        let $block = instance.getBlock();
        let data = {
            padding: $block.css('padding')
        };

        let form = this.app.create('form');
        form.create({
            title: '## blockspacing.spacing ##',
            width: '240px',
            data: data,
            setter: 'blockspacing.save',
            items: {
                padding: { type: 'input', label: '## blockspacing.padding ##' }
            }
        });
        form.setData(data);

        let dropdown = this.app.create('dropdown', 'spacing', { html: form.getElement() });
        this.app.dropdown.open(e, button, dropdown);
    },
    save(form) {
        let instance = this.app.block.get();
        let data = form.getData();

        instance.setStyle({ 'padding': data.padding });
    }
});