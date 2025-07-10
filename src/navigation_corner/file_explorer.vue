<template>
    <div style="display: flex; flex-direction: column; height: 100%">
        <v-list-item title="QH Editor" subtitle="Markdown with html"></v-list-item>
        <v-divider></v-divider>
        <v-list-item link title="選擇資料夾" @click="choseDir()"></v-list-item>
        <!-- <v-list-item link title="Temp"   @click="checkFile()"></v-list-item> -->
        <div style="overflow: auto">
            <v-treeview
                :items="file_item"
                color="warning"
                return-object
                activatable
                open-on-click
                v-model:activated="selection"
                @click:open="addChild"
            >
                <!-- @click:select="selectEvent()"拿掉了這個用法 -->
                <template v-slot:prepend="{ item, isOpen }">
                    <v-icon v-if="!item.filetype">
                        {{ isOpen ? 'mdi-folder-open' : 'mdi-folder' }}
                    </v-icon>
                    <v-icon v-else>
                        {{ files[item.filetype] || 'mdi-file' }}
                    </v-icon>
                </template>
                <template v-slot:title="{ item }">
                    <v-tooltip activator="parent" location="end">{{ item.title }}</v-tooltip>
                    {{ item.title }}
                </template>
            </v-treeview>
        </div>
    </div>
</template>
<script>
export default {
    emits: ['chose-path', 'read-path'], // 宣告自定義事件
    methods: {
        async loadFolderList(directoryPath) {
            const structure = await window.electronAPI.loadFolderStructure(directoryPath);
            //const treeview_structure = this.readDirectoryRecursive(structure);
            //this.file_item = JSON.stringify(structure); // 將 structure 轉換為 JSON
            this.file_item = structure; // 將 structure 轉換為 JSON
            console.log('Load Folder List:', structure);

            // ✅ 傳遞資料夾階層到 App.vue
            //this.$emit('folder-structure', structure);
        },
        // selectEvent() {
        //     console.log('選：', this.selection);
        //     this.$nextTick(() => {
        //         this.$emit('read-path', JSON.stringify(this.selection[0].path));//這是反向對上層執行動作並帶路徑
        //         this.selection=[];
        //     });
        // },
        async addChild(item) {
            const structure = await window.electronAPI.loadFolderStructure(item.id.path);
            item.id.children = structure;
        },
        async choseDir() {
            const selectedDirectory = await window.electronAPI.selectDirectory();
            if (selectedDirectory) {
                this.currentFilePath = selectedDirectory; // 更新当前路径
                this.loadFolderList(selectedDirectory);
            }
        },
        checkFile(item) {
            console.log('目前:', item);
        },
    },
    watch: {
        currentFilePath(newcurrentFilePath) {
            console.log('更新選擇路徑：', newcurrentFilePath);
            this.$emit('chose-path', JSON.stringify(newcurrentFilePath)); //這是反向對上層執行動作並帶路徑
        },
        selection(newSelection) {
            // 確認 newSelection 是否有 filetype 鍵
            if (newSelection.length > 0) {
                const hasFiletypeKey = Object.prototype.hasOwnProperty.call(newSelection[0], 'filetype');
                // console.log(hasFiletypeKey); // true，如果第一个对象有 filetype 键

                if (!hasFiletypeKey) {
                    const haschilepeKey = Object.prototype.hasOwnProperty.call(newSelection[0], 'children');
                    if (haschilepeKey) this.selection = [];
                    this.selectionBefore = [];
                    return; // 如果第一个对象没有 filetype 属性，直接返回
                }
            }

            // 如果有選擇，更新 selectionBefore 並向上層傳遞路徑
            if (newSelection.length > 0) {
                this.selectionBefore = newSelection[0];
                this.$emit('read-path', JSON.stringify(newSelection[0].path)); // 向上層傳遞路徑
            }
            // 如果 newSelection 為空，但之前有選擇過，則還原為之前的選擇
            else if (this.selectionBefore) {
                this.selection = [this.selectionBefore];
            }
        },
    },
    data() {
        return {
            currentFilePath: [],
            selection: [],
            selectionBefore: [],
            file_item: [
                {
                    title: '',
                    disabled: true,
                    filetype: 'notfound',
                },
            ],
            initiallyOpen: ['public'],
            files: {
                html: 'mdi-language-html5',
                js: 'mdi-nodejs',
                json: 'mdi-code-json',
                md: 'mdi-language-markdown',
                pdf: 'mdi-file-pdf-box',
                png: 'mdi-file-image',
                txt: 'mdi-file-document-outline',
                xls: 'mdi-file-excel',
                ppt: 'mdi-file-powerpoint',
                doc: 'mdi-file-word',
                zip: 'mdi-file-zip-box',
                unknown: 'mdi-file-question',
                file: 'mdi-file',
                notfound: 'mdi-file-hidden',
            },
        };
    },
};
</script>
