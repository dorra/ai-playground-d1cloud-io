/*jshint esversion: 6 */
Redactor.add('plugin', 'counter', {
    translations: {
        'en': {
            "counter": {
                "words": "words",
                "chars": "chars"
            }
        }
    },
    subscribe: {
        'editor.insert, editor.set, editor.empty'() {
            this.count();
        }
    },
    start() {
        this.$editor = this.app.editor.getEditor();
        this.$editor.on('keyup.rx-plugin-counter paste.rx-plugin-counter', this.count.bind(this));
        this.count();
    },
    stop() {
        this.$editor.off('.' + this.prefix + '-plugin-counter');

        this.app.statusbar.remove('words');
        this.app.statusbar.remove('chars');
    },
    count() {
        let words = 0,
            characters = 0,
            spaces = 0,
            html = this.$editor.html(),
            arrWords,
            arrSpaces,
            data = {};

        html = this._clean(html);
        if (html !== '') {
            arrWords = html.split(/\s+/);
            arrSpaces = html.match(/\s/g);

            words = (arrWords) ? arrWords.length : 0;
            spaces = (arrSpaces) ? arrSpaces.length : 0;

            characters = html.length;
        }

        // set data
        data = { words: words, characters: characters, spaces: spaces };

        // callback
        this.app.broadcast('counter', data);

        // statusbar
        this.app.statusbar.add('words', this.lang.get('counter.words') + ': ' + data.words);
        this.app.statusbar.add('chars', this.lang.get('counter.chars') + ': ' + data.characters);
    },

    // private
    _clean(html) {
        let utils = this.app.create('utils');

        html = html.replace(/<\/(.*?)>/gi, ' ');
        html = html.replace(/<(.*?)>/gi, '');
        html = html.replace(/\t/gi, '');
        html = html.replace(/\n/gi, ' ');
        html = html.replace(/\r/gi, ' ');
        html = html.replace(/&nbsp;/g, '1');
        html = html.trim();
        html = utils.removeInvisibleChars(html);

        return html;
    }
});