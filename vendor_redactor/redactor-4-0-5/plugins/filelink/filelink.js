/*jshint esversion: 6 */
Redactor.add('plugin', 'filelink', {
    translations: {
        en: {
            "filelink": {
                "file": "File",
                "upload": "Upload",
                "title": "Title",
                "choose": "Choose",
                "placeholder": "Drag to upload a file<br>or click to select"
            }
        }
    },
    defaults: {
        context: true,
        states: true,
        classname: false,
        upload: false,
        select: false,
        name: 'file',
        data: false,
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.2929 3.29289C11.6834 2.90237 12.3166 2.90237 12.7071 3.29289L17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711C17.3166 10.0976 16.6834 10.0976 16.2929 9.70711L13 6.41421V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16V6.41421L7.70711 9.70711C7.31658 10.0976 6.68342 10.0976 6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289L11.2929 3.29289ZM4 16C4.55228 16 5 16.4477 5 17V19C5 19.2652 5.10536 19.5196 5.29289 19.7071C5.48043 19.8946 5.73478 20 6 20H18C18.2652 20 18.5196 19.8946 18.7071 19.7071C18.8946 19.5196 19 19.2652 19 19V17C19 16.4477 19.4477 16 20 16C20.5523 16 21 16.4477 21 17V19C21 19.7957 20.6839 20.5587 20.1213 21.1213C19.5587 21.6839 18.7957 22 18 22H6C5.20435 22 4.44129 21.6839 3.87868 21.1213C3.31607 20.5587 3 19.7956 3 19V17C3 16.4477 3.44772 16 4 16Z"/></svg>'
    },
    subscribe: {
        'editor.load, editor.build': function() {
            this.observeStates();
        }
    },
    modals: {
        create: {
            title: '## filelink.upload ##',
            width: '400px',
            form: {
                title: { type: 'input', label: '## filelink.title ##'},
                file: {}
            }
        },
        choose: {
            title: '## filelink.choose ##',
            width: '400px'
        }
    },
    init() {
        this.dataStates = [];
    },
    start() {
        if (!this._is()) return;

        let button = {
            title: '## filelink.file ##',
            icon: this.opts.get('filelink.icon'),
            command: 'filelink.popup',
            position: { after: 'link' }
        };

        this.app.toolbar.add('file', button);

        if (this.opts.is('filelink.context')) {
            this.app.context.add('file', button);
        }
    },
    popup(e, button) {
        let type = 'create',
            selection = this.app.create('selection'),
            stack = this.app.create('stack');

        if (this.opts.is('filelink.upload')) {
            type = 'add';

            let text = (selection.is()) ? selection.getText() : '';

            stack.create('filelink', this._buildPopupUpload(this.modals.create));
            stack.setData({ title: text });
        }

        // select
        if (this.opts.is('filelink.select')) {
            if (type === 'create') {
                stack.create('file-select', this.popups.choose);
            }

            this.$sbox = stack.getBody();

            let url = this.opts.get('filelink.select');
            if (typeof url === 'string') {
                this.ajax.get({
                    url: url,
                    success: this._parseList.bind(this)
                });
            }
            else {
                this._parseList([url]);
            }
        }

        // open
        this.app.modal.open({ name: 'filelink', stack: stack, button: button });
    },
    insertByUpload(response) {
        let stack = this.app.modal.getStack();

        // data
        let data = stack.getData();

        this.app.modal.close();

        // insert
        this._insert(response, data.title);
    },
    insertBySelect(e) {
        e.preventDefault();

        this.app.modal.close();

        // selection
        let selection = this.app.create('selection'),
            text = (selection.is()) ? selection.getText() : '';

        let $el = this.dom(e.target).closest('.rx-dropdown-stack-item');
        let data = JSON.parse(decodeURI($el.attr('data-params')));

        this._insert({ file: data }, text, true);
    },
    error(response) {
        this.app.broadcast('file.upload.error', { response: response });
    },
    observeStates() {
        this._findFiles().each(this._addFileState.bind(this));
    },
    getStates() {
        let $files = this._findFiles();

        // check status
        for (let [key, item] of Object.entries(this.dataStates)) {
            let status = $files.is('[data-file="' + item.id + '"]');
            this._setFileState(item.id, status);
        }

        return this.dataStates;
    },

    // private
    _is() {
        return (this.opts.is('filelink.upload') || this.opts.is('filelink.select'));
    },
    _insert(response, title, select) {
        for (let [key, item] of Object.entries(response)) {
            // create file link
            let $file = this._createFileAndStore(item, title);

            // broadcast
            let eventType = (select) ? 'select' : 'upload';
            this.app.broadcast('file.' + eventType, { response: response, $el: $file });
            break;
        }
    },
    _buildPopupUpload(obj) {
        obj.form.file = {
            type: 'upload',
            upload: {
                type: 'file',
                box: true,
                placeholder: this.lang.get('filelink.placeholder'),
                url: this.opts.get('filelink.upload'),
                name: this.opts.get('filelink.name'),
                data: this.opts.get('filelink.data'),
                success: 'filelink.insertByUpload',
                error: 'filelink.error'
            }
        };

        return obj;
    },
    _findFiles() {
        return this.app.editor.getEditor().find('[data-file]');
    },
    _addFileState($node) {
        let id = $node.attr('data-file');
        this.dataStates[id] = { type: 'file', status: true, url: $node.attr('src'), $el: $node, id: id };
    },
    _setFileState(url, status) {
        this.dataStates[url].status = status;
    },
    _parseList(data) {
        let $div = this.dom('<div>').addClass('rx-dropdown-stack');

        for (let [key, value] of Object.entries(data)) {
            if (typeof value !== 'object') continue;

            let $item = this.dom('<div>').addClass('rx-dropdown-stack-item');
            $item.attr('data-params', encodeURI(JSON.stringify(value)));

            // file title
            let $title = this.dom('<span>').addClass('rx-dropdown-stack-title');
            $title.text(value.title || value.name);
            $item.append($title);

            // file name
            let $name = this.dom('<span>').addClass('rx-dropdown-stack-aside');
            $name.text(value.name);
            $item.append($name);

            // file size
            let $size = this.dom('<span>').addClass('rx-dropdown-stack-aside');
            $size.text('(' + value.size + ')');
            $item.append($size);

            // event
            $item.on('click', this.insertBySelect.bind(this));

            // append
            $div.append($item);
        }

        this.$sbox.append($div);
    },
    _createFileAndStore(item, title) {
        let instance = this.app.block.get();
        let utils = this.app.create('utils');
        let selection = this.app.create('selection');
        let insertion = this.app.create('insertion');
        let nodes, $file;

        if (instance && instance.isEditable() && selection.is()) {
            nodes = this.app.inline.set({ tag: 'a', caret: 'after' });
            $file = this.dom(nodes);
        }
        else if (instance && !instance.isEditable()) {
            $file = this.dom('<a>');
            let newInstance = this.app.create('block.text');
            newInstance.getBlock().append($file);
            instance.insert({ instance: newInstance, position: 'after' });
        }
        else {
            $file = this.dom('<a>');
            let newInstance = this.app.create('block.text');
            newInstance.getBlock().append($file);
            insertion.insert({ instance: newInstance });
        }


        $file.attr('href', item.url);
        $file.attr('data-file', (item.id) ? item.id : utils.getRandomId());
        $file.attr('data-name', item.name);

        // classname
        if (this.opts.is('filelink.classname')) {
            $file.addClass(this.opts.get('filelink.classname'));
        }

        // title
        title = (title && title !== '') ? title : this._truncateUrl(item.name);
        $file.html(title);

        // select
        selection.select($file);

        return $file;
    },
    _truncateUrl(url) {
        return (url.search(/^http/) !== -1 && url.length > 20) ? url.substring(0, 20) + '...' : url;
    }
});