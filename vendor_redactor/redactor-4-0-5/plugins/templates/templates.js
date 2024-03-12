Redactor.add('plugin', 'templates', {
    translations: {
        en: {
            templates: {
                "templates": "Templates"
            }
        }
    },
    modals: {
        base: {
            title: '## templates.templates ##',
            width: '100%'
        }
    },
    init() {
        this.json = {};
    },
    start() {
        this.app.toolbar.add('templates', {
            title: '## templates.templates ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V7C21 7.53043 20.7893 8.03914 20.4142 8.41421C20.0391 8.78929 19.5304 9 19 9H5C4.46957 9 3.96086 8.78929 3.58579 8.41421C3.21071 8.03914 3 7.53043 3 7V5C3 4.46957 3.21071 3.96086 3.58579 3.58579ZM19 5H5L5 7H19V5ZM3.58579 11.5858C3.96086 11.2107 4.46957 11 5 11H9C9.53043 11 10.0391 11.2107 10.4142 11.5858C10.7893 11.9609 11 12.4696 11 13V19C11 19.5304 10.7893 20.0391 10.4142 20.4142C10.0391 20.7893 9.53043 21 9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V13C3 12.4696 3.21071 11.9609 3.58579 11.5858ZM9 13H5L5 19H9V13ZM13 12C13 11.4477 13.4477 11 14 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H14C13.4477 13 13 12.5523 13 12ZM13 16C13 15.4477 13.4477 15 14 15H20C20.5523 15 21 15.4477 21 16C21 16.5523 20.5523 17 20 17H14C13.4477 17 13 16.5523 13 16ZM13 20C13 19.4477 13.4477 19 14 19H20C20.5523 19 21 19.4477 21 20C21 20.5523 20.5523 21 20 21H14C13.4477 21 13 20.5523 13 20Z"/></svg>',
            command: 'templates.popup',
            position: {
                after: 'add'
            },
            observer: 'templates.observe'
        });
    },
    observe(obj) {
        return this.opts.is('templates') ? obj : false;
    },
    popup(e, button) {
        const stack = this.app.create('stack');
        stack.create('embed', this.modals.base);

        const $body = stack.getBody();
        const snippets = this.opts.get('templates');

        const buildPopup = (data) => {
            this.json = typeof data === 'string' ? JSON.parse(data) : data;

            Object.keys(this.json).forEach(key => {
                const $container = this._buildPreviewContainer($body, key);
                this._buildPreview($container, key);
                this._buildPreviewName($container, key);
            });

            this.app.modal.open({ name: 'templates', stack, button });
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
        const key = $trigger.attr('data-template-key');

        if (this.json.hasOwnProperty(key)) {
            this.app.modal.close();
            const html = this.json[key].html;
            this.app.editor.setContent({ html: html, caret: false });
        }
    },
    _buildPopup(data, $body, stack, button) {
        this.json = typeof data === 'string' ? JSON.parse(data) : data;
        Object.keys(this.json).forEach(key => {
            const $container = this._buildPreviewContainer($body, key);
            this._buildPreview($container, key);
            this._buildPreviewName($container, key);
        });
        this.app.modal.open({ name: 'templates', stack, button });
    },
    _buildPreviewContainer($body, key) {
        const $div = this.dom('<div>').addClass('rx-snippet-container').attr('data-template-key', key);
        $div.one('click', this.insert.bind(this));
        $body.append($div);
        return $div;
    },
    _buildPreview($container, key) {
        const $cont = this.dom('<div>').addClass('rx-snippet-box');
        const $div = this.dom('<div>').addClass(Object.prototype.hasOwnProperty.call(this.json[key], 'image') ? 'rx-template-image' : 'rx-template-preview');
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