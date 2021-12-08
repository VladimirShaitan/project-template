(() => {
    async function supportsWebp() {
        if (!self.createImageBitmap) return false;
        const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
        const blob = await fetch(webpData).then(r => r.blob());
        return createImageBitmap(blob).then(() => true, () => false);
    }

    function filterPictureContents(flag) {
        const type = 'image/webp';
        const templatesNoWebp = document.querySelectorAll('template[data-picture][data-no-webp]');
        const templatesWebp = document.querySelectorAll('template[data-picture][data-webp]');
        if (flag) filterWebp(type, templatesWebp);

        filterNoWebp(type, templatesNoWebp);

    }

    function filterWebp(type, templates) {
        for(const template of templates) {
            const picture = template.content.querySelector('picture');
            const sources = template.content.querySelectorAll('source');
            const defaultSource = picture.querySelector('source[data-default-source]');
            const defaultImg = picture.querySelector('img');

            if(defaultSource === null) continue;

            defaultImg.src = defaultSource.srcset;
            defaultSource.remove();

            for(const source of sources) {
                if(source.getAttribute('type') !== type) source.remove();
            }

            template.parentElement.replaceChild(picture, template);
        }
    }

    function filterNoWebp(type, templates) {
        for (const template of templates) {
            const picture = template.content.querySelector('picture');
            template.parentElement.replaceChild(picture, template);
        }
    }

    document.addEventListener("DOMContentLoaded", e => {
        (async () => {
            if(await supportsWebp()) {
                filterPictureContents(true);
            } else {
                filterPictureContents(false);
            }
        })();
    });
})()