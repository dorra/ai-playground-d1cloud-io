/*jshint esversion: 6 */
Redactor.add('plugin', 'definedlinks', {
    defaults: {
        items: false
    },
    subscribe: {
        'modal.open': function() {
            if (!this.opts.is('definedlinks.items')) return;

            let name = this.app.modal.getName();
            if (name === 'link') {
                this._build();
            }
        }
    },

    // private
    _build() {
        let stack = this.app.modal.getStack(),
            $item = stack.getFormItem('text'),
            $box = this.dom('<div>').addClass('rx-form-item');

        // select
        this.$select = this._create();

        $box.append(this.$select);
        $item.before($box);
    },
    _change(e) {
        let key = this.dom(e.target).val(),
            items = this.opts.get('definedlinks.items'),
            data = items[key],
            stack = this.app.modal.getStack(),
            $text = stack.getInput('text'),
            $url = stack.getInput('url'),
            name = data.name,
            url = data.url;

        if (data.url === false) {
            url = '';
            name = '';
        }

        // text
        if ($text.val() === '') {
            $text.val(name);
        }

        // url
        $url.val(url);
    },
    _create() {
        let items = this.opts.get('definedlinks.items');
        let $select = this.dom('<select>').addClass('rx-form-select');
        $select.on('change', this._change.bind(this));

        for (let i = 0; i < items.length; i++) {
            let data = items[i],
                $option = this.dom('<option>');

            $option.val(i);
            $option.html(data.name);

            $select.append($option);
        }

        return $select;
    }
});