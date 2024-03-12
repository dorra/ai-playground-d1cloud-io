<script setup>
import DropZone from 'dropzone-vue'
import { ref } from 'vue'

const response = ref(''),
        site_url = ref(window.versavision.site_url + '/upload')

function sending(files, xhr, formData) {
    console.log(files)
    console.log(xhr)
    console.log(formData)
//     function callback(e) {
//         response.value = e;
//     }
//
//     xhr.onreadystatechange = () => {
//         if (xhr.readyState === 4) {
//             callback(xhr.response);
//         }
//     };
}

console.log(window.versavision.site_url);
console.log(site_url.value);
</script>

<template>

<template v-if="!response">
    <div class="dropzone">
        <DropZone
            :maxFiles="Number(1)"
            :url=site_url.value
            :uploadOnDrop="true"
            :multipleUpload="true"
            :parallelUpload="1"
            @sending="sending">
            <template v-slot:message>Choose a photo</template>
        </DropZone>
    </div>
</template>
<template v-else>
    <div v-html="response"></div>
</template>

</template>
