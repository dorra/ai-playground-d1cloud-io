Redactor.add('plugin', 'snippets', {
    translations: {
        en: {
            snippets: {
                "snippets": "Snippets"
            }
        }
    },
    modals: {
        base: {
            title: '## snippets.snippets ##',
            width: '100%'
        }
    },
    init() {
        this.json = {};
    },
    start() {
        this.app.addbar.add('snippets', {
            title: '## snippets.snippets ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11 4C10.7348 4 10.4804 4.10536 10.2929 4.29289C10.1054 4.48043 10 4.73478 10 5C10 5.26522 10.1054 5.51957 10.2929 5.70711C10.4804 5.89464 10.7348 6 11 6H13C13.2652 6 13.5196 5.89464 13.7071 5.70711C13.8946 5.51957 14 5.26522 14 5C14 4.73478 13.8946 4.48043 13.7071 4.29289C13.5196 4.10536 13.2652 4 13 4H11ZM8.87868 2.87868C9.44129 2.31607 10.2044 2 11 2H13C13.7956 2 14.5587 2.31607 15.1213 2.87868C15.4407 3.19808 15.6807 3.5821 15.8284 4H17C17.7956 4 18.5587 4.31607 19.1213 4.87868C19.6839 5.44129 20 6.20435 20 7V19C20 19.7957 19.6839 20.5587 19.1213 21.1213C18.5587 21.6839 17.7957 22 17 22H7C6.20435 22 5.44129 21.6839 4.87868 21.1213C4.31607 20.5587 4 19.7957 4 19V7C4 6.20435 4.31607 5.44129 4.87868 4.87868C5.44129 4.31607 6.20435 4 7 4H8.17157C8.31933 3.5821 8.55928 3.19808 8.87868 2.87868ZM8.17157 6H7C6.73478 6 6.48043 6.10536 6.29289 6.29289C6.10536 6.48043 6 6.73478 6 7V19C6 19.2652 6.10536 19.5196 6.29289 19.7071C6.48043 19.8946 6.73478 20 7 20H17C17.2652 20 17.5196 19.8946 17.7071 19.7071C17.8946 19.5196 18 19.2652 18 19V7C18 6.73478 17.8946 6.48043 17.7071 6.29289C17.5196 6.10536 17.2652 6 17 6H15.8284C15.6807 6.4179 15.4407 6.80192 15.1213 7.12132C14.5587 7.68393 13.7956 8 13 8H11C10.2044 8 9.44129 7.68393 8.87868 7.12132C8.55928 6.80192 8.31933 6.4179 8.17157 6ZM8 12C8 11.4477 8.44772 11 9 11H15C15.5523 11 16 11.4477 16 12C16 12.5523 15.5523 13 15 13H9C8.44772 13 8 12.5523 8 12ZM8 16C8 15.4477 8.44772 15 9 15H15C15.5523 15 16 15.4477 16 16C16 16.5523 15.5523 17 15 17H9C8.44772 17 8 16.5523 8 16Z"/></svg>',
            command: 'snippets.popup',
            observer: 'snippets.observe'
        });
    },
    observe(obj) {
        return this.opts.is('snippets') ? obj : false;
    },
    popup(e, button) {
        const stack = this.app.create('stack');
        stack.create('embed', this.modals.base);

        const $body = stack.getBody();
        const snippets = this.opts.get('snippets');

        const buildPopup = (data) => {
            this.json = typeof data === 'string' ? JSON.parse(data) : data;

            Object.keys(this.json).forEach(key => {
                const $container = this._buildPreviewContainer($body, key);
                this._buildPreview($container, key);
                this._buildPreviewName($container, key);
            });

            this.app.modal.open({ name: 'snippets', stack, button });
        };

        if (typeof snippets === 'string') {
            const getdata = this.opts.is('reloadmarker') ? { d: new Date().getTime() } : {};
            this.ajax.get({
                url: snippets,
                data: getdata,
                success: buildPopup.bind(this)
            });
        } else {
            buildPopup(snippets);
        }
    },
    insert(e) {
        const $trigger = this.dom(e.target).closest('.rx-snippet-container');
        const key = $trigger.attr('data-snippet-key');

        if (this.json.hasOwnProperty(key)) {
            this.app.modal.close();
            const html = this.json[key].html;
            const insertion = this.app.create('insertion');
            insertion.insert({ html, caret: 'end' });
        }
    },

    _buildPopup(data, $body, stack, button) {
        this.json = typeof data === 'string' ? JSON.parse(data) : data;
        Object.keys(this.json).forEach(key => {
            const $container = this._buildPreviewContainer($body, key);
            this._buildPreview($container, key);
            this._buildPreviewName($container, key);
        });
        this.app.modal.open({ name: 'snippets', stack, button });
    },
    _buildPreviewContainer($body, key) {
        const $div = this.dom('<div>').addClass('rx-snippet-container').attr('data-snippet-key', key);
        $div.one('click', this.insert.bind(this));
        $body.append($div);
        return $div;
    },
    _buildPreview($container, key) {
        const $cont = this.dom('<div>').addClass('rx-snippet-box');
        const $div = this.dom('<div>').addClass(Object.prototype.hasOwnProperty.call(this.json[key], 'image') ? 'rx-snippet-image' : 'rx-snippet-preview');
        if (this.json[key].hasOwnProperty('image')) {
            $div.html(this.dom('<img>').attr('src', this.json[key].image));
        } else {
            $div.html(this.json[key].html);
        }
        $cont.append($div);
        $container.append($cont);
    },
    _buildPreviewName($container, key) {
        if (!this.json[key].hasOwnProperty('name')) return;
        const $span = this.dom('<div>').addClass('rx-snippet-name').text(this.json[key].name);
        $container.append($span);
    }
});