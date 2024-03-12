/*jshint esversion: 6 */


// Block
Redactor.add('block', 'math', {
    mixins: ['block'],
    props: {
        type: 'math',
        editable: false,
        control: false,
        inline: true,
        focusable: true
    },
    defaults: {
        content: { getter: 'getContent', setter: 'setContent' }
    },
    create() {
        return this.dom('<span>').attr(this.opts.get('dataBlock'), 'math');
    }
});


// Plugin
Redactor.add('plugin', 'math', {
    translations: {
        en: {
            "math": {
                "math": "Math",
                "label": "Type an expression",
                "add": "Add",
                "save": "Save",
                "cancel": "Cancel"
            },
             "blocks": {
                 "math": "Math"
             }
        }
    },
    defaults: {
        context: false,
        classname: 'math',
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
        ]
    },
    modals: {
        add: {
            title: '## math.math ##',
            width: '100%',
            form: {
                text: { label: '## math.label ##', type: 'textarea', rows: 6 }
            },
            footer: {
                insert: { title: '## math.add ##', command: 'math.insert', type: 'primary' },
                cancel: { title: '## math.cancel ##', command: 'modal.close' }
            }
        },
        edit: {
            title: '## math.math ##',
            width: '100%',
            form: {
                text: { label: '## math.label ##', type: 'textarea', rows: 6 }
            },
            footer: {
                save: { title: '## math.save ##', command: 'math.save', type: 'primary' },
                cancel: { title: '## math.cancel ##', command: 'modal.close' }
            }
        }
    },
    subscribe: {
        'editor.parse': function(event) {
            this._parse(event);
        },
        'editor.unparse, editor.before.cut, editor.before.copy': function(event) {
            this._unparse(event);
        },
        'editor.load, source.close, state.undo, state.redo, editor.paste': function() {
            this._render();
        }
    },
    start() {
        let button = {
            title: '## blocks.math ##',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.79386 13C6.65289 13.7907 6.53267 14.5451 6.42109 15.2453C6.41506 15.2831 6.40907 15.3207 6.4031 15.3582C6.22983 16.445 6.07887 17.3777 5.90061 18.1501C5.71832 18.9401 5.53058 19.451 5.33541 19.7488C5.17368 19.9957 5.08127 20 5 20C4.73478 20 4.48043 19.8946 4.29289 19.7071C4.10536 19.5196 4 19.2652 4 19C4 18.4477 3.55228 18 3 18C2.44772 18 2 18.4477 2 19C2 19.7957 2.31607 20.5587 2.87868 21.1213C3.44129 21.6839 4.20435 22 5 22C5.91873 22 6.57632 21.5043 7.00834 20.8449C7.40692 20.2365 7.65668 19.4349 7.84939 18.5999C8.04613 17.7473 8.20767 16.7425 8.37815 15.6731L8.39449 15.5706C8.52402 14.7578 8.66118 13.8972 8.82639 13H11C11.5523 13 12 12.5523 12 12C12 11.4477 11.5523 11 11 11H9.20614C9.34711 10.2093 9.46733 9.45487 9.57892 8.75467C9.58494 8.71689 9.59093 8.67927 9.5969 8.64181C9.77017 7.55496 9.92113 6.62234 10.0994 5.84986C10.2817 5.05995 10.4694 4.54903 10.6646 4.25115C10.8263 4.00429 10.9187 4 11 4C11.2652 4 11.5196 4.10536 11.7071 4.29289C11.8946 4.48043 12 4.73478 12 5C12 5.55228 12.4477 6 13 6C13.5523 6 14 5.55228 14 5C14 4.20435 13.6839 3.44129 13.1213 2.87868C12.5587 2.31607 11.7956 2 11 2C10.0813 2 9.42368 2.49571 8.99166 3.1551C8.59308 3.76347 8.34332 4.56505 8.15061 5.40014C7.95387 6.25266 7.79233 7.25754 7.62185 8.32694C7.61641 8.36102 7.61097 8.39519 7.60551 8.42944C7.47598 9.24219 7.33882 10.1028 7.17361 11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H6.79386ZM14.2929 11.2929C14.6834 10.9024 15.3166 10.9024 15.7071 11.2929L18 13.5858L20.2929 11.2929C20.6834 10.9024 21.3166 10.9024 21.7071 11.2929C22.0976 11.6834 22.0976 12.3166 21.7071 12.7071L19.4142 15L21.7071 17.2929C22.0976 17.6834 22.0976 18.3166 21.7071 18.7071C21.3166 19.0976 20.6834 19.0976 20.2929 18.7071L18 16.4142L15.7071 18.7071C15.3166 19.0976 14.6834 19.0976 14.2929 18.7071C13.9024 18.3166 13.9024 17.6834 14.2929 17.2929L16.5858 15L14.2929 12.7071C13.9024 12.3166 13.9024 11.6834 14.2929 11.2929Z"/></svg>',
            command: 'math.popup'
        };
        let buttonEdit = Redactor.extend(true, {}, button);
        buttonEdit.command = 'math.edit';

        this.app.addbar.add('math', button);
        this.app.toolbar.add('math', buttonEdit);

        if (this.opts.is('math.context')) {
            this.app.context.add('math', buttonEdit);
        }
    },
    popup(e, button) {
        let stack = this.app.create('stack');
        stack.create('math', this.modals.add);

        // open
        this.app.modal.open({ name: 'math', stack: stack, focus: 'text', button: button });
    },
    edit(e, button) {
        let stack = this.app.create('stack');
        stack.create('math', this.modals.edit);

        // data
        let instance = this.app.block.get();
        if (!instance || !instance.isType('math')) {
            return this.popup();
        }

        let $block = instance.getBlock();
        let code = decodeURI($block.attr('data-math-code'));
        code = this._decodeSigns(code);

        // set
        stack.setData({ text: code });

        // open
        this.app.modal.open({ name: 'math', stack: stack, focus: 'text', button: button });
    },
    save(stack) {
        this.app.modal.close();

        let instance = this.app.block.get();
        if (!instance || !instance.isType('math')) {
            return;
        }

        let $block = instance.getBlock();
        let code = this._buildBlock($block, stack);

        if (code !== false) {
            this._renderDisplay($block);
            this._renderTypeset($block, code);
        }
    },
    insert(stack) {
        this.app.modal.close();

        // create
        let instance = this.app.create('block.math');
        let $block = instance.getBlock();
        let code = this._buildBlock($block, stack);

        if (code !== false) {
            let insertion = this.app.create('insertion');
            insertion.insert({ instance: instance, caret: 'start' });

            this._renderDisplay($block);
            this._renderTypeset($block, code);
        }
    },

    // private
    _buildBlock($block, stack) {
        let data = stack.getData(),
            code = data.text.trim();

        let delim = this._parseDelim(code);
        if (!delim) {
            return false; //'$$' + code + '$$';
        }

        $block.attr('data-math-display', delim.display);
        $block.attr('data-math-code', encodeURI(code));

        // katex
        code = code.replace(delim.left, '').replace(delim.right, '');

        $block.html(code);

        return code;
    },
    _renderTypeset($block, code) {
        // katex
        this._renderNode($block, code);
    },
    _renderDisplay($node) {
        var display = $node.attr('data-math-display');
        var obj = { display: 'inline-block', 'text-align': '' };
        if (display) {
            obj = { display: 'block', 'text-align': 'center' };
            $node.addClass('math-display');
        }
        else {
            $node.removeClass('math-display');
        }

        $node.css(obj);
    },
    _renderNode($node, code) {
        this._getKatex().render(code, $node.get(), { displayMode: $node.attr('data-math-display') });
    },
    _render() {
        this.app.editor.getEditor().find('.' + this.opts.get('math.classname')).each(function($node) {
            this._renderDisplay($node);

            // katex
            if ($node.attr('data-math-render')) return;
            this._renderNode($node, $node.text());
            $node.attr('data-math-render', true);

        }.bind(this));
    },
    _parseDelim(code) {
        let delim = this.opts.get('math.delimiters'),
            utils = this.app.create('utils');

        for (var i = 0; i < delim.length; i++) {
            var re = new RegExp('^' + utils.escapeRegExp(delim[i].left));
            if (code.search(re) !== -1) {
                return delim[i];
            }
        }
    },
    _getKatex() {
        return this.app.getWinNode().katex;
    },
    _getReplacer(code, datacode, display) {
        var start = '<span class=' + this.opts.get('math.classname') + ' data-rx-type="math" data-math-code="' + datacode + '" data-math-display="' + display + '">';
        var end = '</span>';

        return start + code + end;
    },
    _encodeSigns(code) {
        code = code.replace(/\$\$/g, 'xdoubledollarsignz');
        code = code.replace(/\$/g, 'xsingledollarsignz');

        return code;
    },
    _decodeSigns(code) {
        code = code.replace(/xdoubledollarsignz/g, "$$$");
        code = code.replace(/xsingledollarsignz/g, "$");

        return code;
    },
    _parse(event) {
        let html = event.get('html'),
            delim = this.opts.get('math.delimiters'),
            utils = this.app.create('utils');

        for (let i = 0; i < delim.length; i++) {
            let rcont = (delim[i].display) ? '([\\w\\W]*?)' : '(.*?)';
            let re = new RegExp(utils.escapeRegExp(delim[i].left) + rcont + utils.escapeRegExp(delim[i].right), 'g');
            let match = html.match(re);
            if (match != null) {
                for (var z = 0; z < match.length; z++) {
                    // code
                    var code = match[z].trim();
                    var datacode = this._encodeSigns(code);
                    datacode = encodeURI(datacode);

                    // katex
                    code = code.replace(delim[i].left, '').replace(delim[i].right, '');

                    // replace
                    html = html.replace(match[z], this._getReplacer(code, datacode, delim[i].display));
                }
            }
        }

        event.set('html', html);
    },
    _unparse(event) {
        var html = event.get('html');
        let utils = this.app.create('utils');

        html = utils.wrap(html, function($w) {
            $w.find('.' + this.opts.get('math.classname')).each(function($node) {
                var code = decodeURI($node.attr('data-math-code'));
                code = this._decodeSigns(code);
                code = code.replace(/&/g, 'xampsignmathz');
                $node.text(code);
                $node.unwrap();
            }.bind(this));
        }.bind(this));

        html = html.replace(/xampsignmathz/g, '&');

        event.set('html', html);
    },
    _copy(event) {
        var html = event.get('html');

        event.set('html', html);
    }
});