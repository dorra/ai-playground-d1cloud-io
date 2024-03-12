/*jshint esversion: 6 */
Redactor.add('plugin', 'mergetag', {
    translations: {
        'en': {
            "mergetag": {
                "title": "Merge Tag"
            }
        }
    },
    defaults: {
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.44721 3.10558C5.94119 3.35257 6.14142 3.95324 5.89443 4.44722C3.54612 9.14383 3.51471 13.8353 5.92308 19.6154C6.13549 20.1252 5.89442 20.7107 5.38462 20.9231C4.87481 21.1355 4.28934 20.8944 4.07692 20.3846C1.48529 14.1647 1.45388 8.85618 4.10557 3.55279C4.35256 3.05881 4.95324 2.85859 5.44721 3.10558ZM18.5528 3.10558C19.0468 2.85859 19.6474 3.05881 19.8944 3.55279C22.5461 8.85618 22.5147 14.1647 19.9231 20.3846C19.7107 20.8944 19.1252 21.1355 18.6154 20.9231C18.1056 20.7107 17.8645 20.1252 18.0769 19.6154C20.4853 13.8353 20.4539 9.14383 18.1056 4.44722C17.8586 3.95324 18.0588 3.35257 18.5528 3.10558ZM8 9.00001C8 8.44772 8.44772 8.00001 9 8.00001H10C10.4378 8.00001 10.8703 8.11764 11.2422 8.4343C11.5725 8.71547 11.772 9.08671 11.9155 9.40907C12.0409 9.69069 12.1631 10.0307 12.2915 10.3943C12.5475 10.0768 12.8201 9.76574 13.1054 9.4804C13.829 8.75676 14.8283 8.00001 16 8.00001C16.5523 8.00001 17 8.44772 17 9.00001C17 9.55229 16.5523 10 16 10C15.6717 10 15.171 10.2433 14.5196 10.8946C14.0234 11.3908 13.5495 12.0122 13.1258 12.6225C13.2934 13.0645 13.4291 13.4521 13.5447 13.7836L13.5471 13.7904C13.7057 14.2451 13.8132 14.5535 13.9161 14.7854C13.9648 14.8951 14.0017 14.9617 14.0255 15H15C15.5523 15 16 15.4477 16 16C16 16.5523 15.5523 17 15 17H14C13.5627 17 13.1308 16.8827 12.7594 16.5676C12.4288 16.287 12.2301 15.9169 12.0879 15.5963C11.9615 15.3113 11.8394 14.9672 11.7118 14.6015C11.4549 14.9205 11.1812 15.233 10.8946 15.5196C10.171 16.2433 9.17166 17 8 17C7.44772 17 7 16.5523 7 16C7 15.4477 7.44772 15 8 15C8.32834 15 8.82903 14.7568 9.48039 14.1054C9.97893 13.6069 10.455 12.9819 10.8802 12.3689C10.7173 11.9416 10.5841 11.5659 10.47 11.2426L10.4614 11.2183C10.3015 10.7653 10.1924 10.4561 10.0885 10.2227C10.0374 10.108 9.99895 10.0392 9.97437 10H9C8.44772 10 8 9.55229 8 9.00001Z"/></svg>',
        items: ['Name', 'Lastname', 'Email']
    },
    init() {
        this.app.observer.addKeys('blocks', 'mergetag', ['mergetag']);
    },
    start() {
        if (!this.opts.is('mergetag.items')) return;

        let button = { title: this.lang.get('mergetag.title'), icon: this.defaults.icon, command: 'mergetag.popup' };

        this.app.context.add('mergetag', { title: this.lang.get('mergetag.title'), text: true, command: 'mergetag.popup', observer: 'mergetag.observe' }, true);
        this.app.context.add('trash', { command: 'mergetag.remove' }, true);

        this.app.toolbar.add('mergetag', button);
        this.app.addbar.add('mergetag', button);
    },
    popup(e, button) {
        let buttons = [...this.opts.get('mergetag.items')],
            buttonsObj = {};


        let command = (button.getType() === 'context') ? 'mergetag.set' : 'mergetag.add';
        let instance = this.app.block.get();
        let active = false;
        if (instance && instance.isType('mergetag')) {
            active = instance.getContent();
        }

        for (let i = 0; i < buttons.length; i++) {
            buttonsObj[buttons[i]] = {
                title: buttons[i],
                active: (active === buttons[i]),
                command: command
            };
        }

        let dropdown = this.app.create('dropdown', 'mergetag', { items: buttonsObj });
        this.app.dropdown.open(e, button, dropdown);
    },
    observe(obj, name, toolbar) {
        if (toolbar === 'context' && name === 'mergetag') {
            let instance = this.app.context.getInstance();
            let button = this.app.context.getButton('mergetag');
            if (instance) {
                obj.title = instance.getContent();
            }
        }

        return obj;
    },
    add(e, button, name) {
        this.app.dropdown.close();

        let instance = this.app.block.get();
        if (instance && instance.isType('mergetag')) {
            instance.setContent(name);

            let context = this.app.context.getInstance();
            if (context) {
                let button = this.app.context.getButton('mergetag');
                button.setTitle(name);
            }
            return;
        }

        let insertion = this.app.create('insertion');
        let mergetag = this.app.create('block.mergetag', { content: name });
        let selection = this.app.create('selection');
        let inserted = insertion.insert({ instance: mergetag, caret: 'start' });


    },
    set(e, button, name) {
        this.app.dropdown.close();

        let context = this.app.context.getInstance();
        context.setContent(name);
    },
    remove() {
        let instance = this.app.context.getInstance(),
            caret = this.app.create('caret');

        caret.set(instance.getBlock(), 'after');
        instance.remove();

        this.app.dropdown.close();
        this.app.context.close();
    }
});