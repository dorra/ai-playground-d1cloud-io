/*jshint esversion: 6 */
Redactor.add('plugin', 'textexpander', {
    defaults: {
        items: false
    },
    start() {
        if (!this.opts.is('textexpander.items')) return;

        this.$editor = this.app.editor.getEditor();
        this.$editor.on('keyup.rx-plugin-textexpander', this._expand.bind(this));
    },
    stop() {
        this.$editor.off('.rx-plugin-textexpander');
    },

    // private
    _expand(e) {
        let key = e.which;
        if (key !== this.app.keycodes.SPACE) {
            return;
        }

        let items = this.opts.get('textexpander.items'),
            utils = this.app.create('utils'),
            selection = this.app.create('selection');

        for (let [key, str] of Object.entries(items)) {
            let re = new RegExp(utils.escapeRegExp(key) + '\\s$');
            let len = key.length + 1;
            let rangeText = selection.getText('before', len).trim();

            if (key === rangeText) {
                return this._replaceSelection(re, str);
            }

        }
    },
    _replaceSelection(re, replacement) {
        let marker = this.app.create('marker');

        marker.insert();

        let markerNode = marker.find('start'),
            current = markerNode.previousSibling,
            currentText = current.textContent;

        currentText = currentText.replace(/&nbsp;/, ' ');
        currentText = currentText.replace(re, replacement);
        current.textContent = currentText;

        marker.remove();
        return;
    }
});