<template>
    <v-layout ref="app" class="rounded rounded-md" fluid style="height: 100vh">
        <v-navigation-drawer color="grey-darken-2" permanent width="200" name="app-bar2">
            <FileExplorer @chose-path="handleChosePath" @read-path="handleReadPath" />
        </v-navigation-drawer>

        <v-app-bar color="grey-lighten-2" flat name="app-bar">
            <v-toolbar-title class="text-left">{{ currentPath }}</v-toolbar-title>
            <template v-slot:prepend>
                <v-toolbar-items>
                    <v-btn variant="tonal" dark @click="Savebtn"> Save this! </v-btn>
                    <!--<v-btn variant="tonal" dark @click="handleReadPath"> Copy Path! </v-btn>
         <v-btn class="mx-auto" variant="tonal" @click="hide_alert('??','red','mdi-exclamation',1000)">
          Show alert? {{ alert.flag }}
        </v-btn> -->
                    <v-btn variant="tonal" dark @click="dirWalker">Copy Gsys</v-btn>
                </v-toolbar-items>
            </template>
            <v-toolbar-items>
                <v-alert
                    v-model="alert.flag"
                    dark
                    :color="alert.color"
                    border="top"
                    transition="slide-y-transition"
                    density="compact"
                    :icon="alert.icon"
                >
                    {{ alert.text }}
                </v-alert>
            </v-toolbar-items>
        </v-app-bar>

        <v-main style="display: flex; height: 100vh; margin: 0">
            <EditorComponent @editor-ready="handleEditorReady" />
        </v-main>

        <!-- 階層 -->
        <v-dialog v-model="dirWalkerDialog" max-width="800">
            <v-card>
                <v-card-title class="d-flex align-center gap-2">
                    <span>複製Gsys資料結構</span>
                    <v-spacer></v-spacer>
                    <v-text-field
                        v-model="newFolderName"
                        label="新資料夾名稱"
                        density="compact"
                        style="max-width: 200px"
                        hide-details
                        class="ma-0"
                    />
                    <v-btn color="primary" density="comfortable" @click="handleCopyFolders"> 複製勾選項目 </v-btn>
                    <v-alert
                        v-model="cardAlert.flag"
                        dark
                        :color="cardAlert.color"
                        border="top"
                        transition="slide-y-transition"
                        density="compact"
                        :icon="cardAlert.icon"
                        class="ma-0 pa-1"
                        style="max-width: 250px"
                    >
                        {{ cardAlert.text }}
                    </v-alert>
                </v-card-title>
                <v-card-text>
                    <v-table density="compact" class="folder-table" striped="even">
                        <thead>
                            <tr>
                                <th class="text-left">Node</th>
                                <th class="text-left">Data type</th>
                                <th class="text-left">Address</th>
                                <th class="text-left">Last Ver</th>
                                <th class="text-left">Copy Check</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in folderTable" :key="index">
                                <!-- level1 -->
                                <td
                                    v-if="!isDuplicate(folderTable, index, 'level1')"
                                    :rowspan="getRowSpan(folderTable, index, 'level1')"
                                >
                                    {{ item.level1 }}
                                </td>

                                <!-- level2 -->
                                <td
                                    v-if="!isDuplicate(folderTable, index, 'level2')"
                                    :rowspan="getRowSpan(folderTable, index, 'level2')"
                                >
                                    {{ item.level2 }}
                                </td>

                                <!-- level3 和 level4 不合併 -->
                                <td>{{ item.level3 }}</td>
                                <td>{{ item.level4 }}</td>
                                <td>
                                    <input type="checkbox" v-model="folderSelection[index]" />
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="primary" text @click="dirWalkerDialog = false">關閉</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!--確認用容器 -->
        <ConfirmDlg ref="confirm" />
    </v-layout>
</template>

<script>
import EditorComponent from './main_corner/ckeditor.vue'; // 引入新的組件
import ConfirmDlg from './main_corner/ConfirmDlg.vue'; // 引入新的組件
import FileExplorer from './navigation_corner/file_explorer.vue'; // 引入新的組件
// 使用外部的 hash 函數庫，例如 crypto-js
import CryptoJS from 'crypto-js';

import { formatMarkdownWithHtmlBlocks } from './utils/formatMixedMarkdownHtml';

export default {
    methods: {
        handleEditorReady(editor) {
            this.editorInstance = editor; // 儲存編輯器實例
        },
        hide_alert(text, color, icon, time) {
            //console.log('alert');
            this.alert.flag = true;
            this.alert.text = text;
            this.alert.color = color;
            this.alert.icon = icon;
            window.setTimeout(() => {
                this.alert.flag = false;
                //console.log("hide alert after 3 seconds");
            }, time);
        },
        hide_cardAlert(text, color, icon, time) {
            //console.log('alert');
            this.cardAlert.flag = true;
            this.cardAlert.text = text;
            this.cardAlert.color = color;
            this.cardAlert.icon = icon;
            window.setTimeout(() => {
                this.cardAlert.flag = false;
                //console.log("hide alert after 3 seconds");
            }, time);
        },
        async Savebtn() {
            if (this.currentFilePath !== '') {
                if (
                    (await this.$refs.confirm.open(
                        '儲存檔案',
                        '確定儲存此檔案?',
                        {},
                        'Yes', // btn1
                        'No' // btn2
                    )) === 'No'
                ) {
                    return; // 如果用戶不想載入新檔案，則退出
                }
                this.saveFile(this.currentFilePath);
            } else {
                await this.$refs.confirm.open(
                    '無選擇檔案',
                    '請先選擇檔案!',
                    {},
                    'Yes' // btn1
                );
            }
        },
        replaceTabsMarkers(data, reverse = false) {
            let result = data;

            if (reverse) {
                // 移除已包裝過的區塊
                result = result.replace(/```html\s*\n([\s\S]*?)\n```/gi, (_, content) => content);

                // 包裝 <script>
                result = result.replace(
                    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
                    (match) => '```html\n' + match + '\n```'
                );

                // 包裝 <div>
                result = result.replace(/<div\b[^>]*>[\s\S]*?<\/div>/gi, (match) => '```html\n' + match + '\n```');

                // 包裝 <span>
                result = result.replace(/<span\b[^>]*>[\s\S]*?<\/span>/gi, (match) => '```html\n' + match + '\n```');

                // 包裝 HTML 註解
                result = result.replace(/<!--[\s\S]*?-->/g, (match) => '```html\n' + match + '\n```');
            } else {
                // 還原所有包裝
                result = result.replace(/```html\s*\n([\s\S]*?)\n```/gi, (_, content) => content);
            }

            return result;
        },
        async saveFile(path) {
            let editorData = this.editorInstance.getData();
            editorData = this.replaceTabsMarkers(editorData); //替換成doscify可接受的tab flag
            editorData = editorData.replace(/&nbsp;/g, '');
            editorData = await formatMarkdownWithHtmlBlocks(editorData); // 使用 AST 處理 HTML 格式化
            this.originalHash = CryptoJS.SHA256(editorData).toString(); //計算hash

            await window.electronAPI.saveFile(path, editorData);
            this.hide_alert('Save file success.', 'green', 'mdi-file-check', 3000);
        },
        async loadFile(path) {
            // 更新目前檔案路徑和內容
            let data = await window.electronAPI.loadFileContent(path);
            data = await formatMarkdownWithHtmlBlocks(data); // 使用 AST 處理 格式化
            data = data.replace(/&nbsp;/g, '');
            this.originalHash = CryptoJS.SHA256(data).toString(); //計算hash
            data = this.replaceTabsMarkers(data, true); //替換成ckeditor可接受的tab flag

            console.log('load ori', this.originalHash);
            this.currentFilePath = path;
            this.currentPath = path.replace(/\\\\/g, '\\'); // 更新当前路径
            this.editorInstance.setData(data); // 設定編輯器內容
            this.hide_alert('Read file success.', 'green', 'mdi-file-check', 2000);
        },
        handleChosePath(path) {
            if (path) {
                if (path.startsWith('"') && path.endsWith('"')) {
                    // 去除開頭和結尾的引號
                    path = path.slice(1, -1);
                }
                this.currentPath = path.replace(/\\\\/g, '\\'); // 更新当前路径
            }
        },
        async handleReadPath(path) {
            if (path) {
                if (path.startsWith('"') && path.endsWith('"')) {
                    // 去除開頭和結尾的引號ㄒ
                    path = path.slice(1, -1);
                }
                // console.log("PATH:", path);

                // 確認是否要載入新檔案
                if (
                    (await this.$refs.confirm.open(
                        '載入檔案',
                        '確定要載入此檔案?',
                        {},
                        'Yes', // btn1
                        'No' // btn2
                    )) === 'No'
                ) {
                    return; // 如果用戶不想載入新檔案，則退出
                }

                let data = '';
                let newHash = '';
                let custumosChose = '';
                // 如果原始內容哈希不為空，表示已經有檔案被載入
                if (this.originalHash !== '') {
                    // 讀取文件內容來計算哈希值，但不設置到編輯器中
                    data = this.editorInstance.getData();
                    data = this.replaceTabsMarkers(data); //替換成doscify可接受的tab flag
                    data = data.replace(/&nbsp;/g, '');
                    data = await formatMarkdownWithHtmlBlocks(data); // 使用 AST 處理 HTML 格式化

                    console.log('loaddata\n', data);
                    newHash = CryptoJS.SHA256(data).toString();
                    console.log('current', newHash);
                    console.log('ori', this.originalHash);
                    // console.log('check', data);b
                    // 檢查是否有未保存的變更
                    if (this.originalHash !== newHash) {
                        // 確認是否要覆寫
                        custumosChose = await this.$refs.confirm.open(
                            '檔案變更',
                            '檔案內容尚未儲存，確定要讀取嗎?',
                            {},
                            '取消', // btn1
                            '儲存', // btn2
                            '略過' // btn3
                        );
                    }
                }
                if (custumosChose === '取消') {
                    return; //
                } else if (custumosChose === '儲存') {
                    await this.saveFile(this.currentFilePath);
                }
                this.loadFile(path);
            }
        },
        async recursiveLoad(path) {
            const entries = await window.electronAPI.loadFolderStructure(path);
            for (const entry of entries) {
                if (!entry.filetype) {
                    entry.children = await this.recursiveLoad(entry.path);
                }
            }
            return entries;
        },
        flattenToTable(entries, parentPath, tempResult) {
            for (const item of entries) {
                if (!item.filetype) {
                    const newPath = [...parentPath, item.title];
                    const hasChildren = item.children && item.children.length > 0;

                    if (hasChildren) {
                        this.flattenToTable(item.children, newPath, tempResult);
                    }

                    // 只記錄最深層或第四層
                    if (!hasChildren || newPath.length === 4) {
                        tempResult.push(newPath);
                    }
                }
            }
        },
        filterLatestEntries(flatPaths) {
            const map = new Map();

            for (const path of flatPaths) {
                const key = path.slice(0, 3).join('|'); // 前三層為 key
                map.set(key, path); // 重複的 key 會被覆蓋（保留最新）
            }

            // 轉換為 table row 格式
            return [...map.values()].map(this.pathArrayToRow);
        },
        pathArrayToRow(pathArray) {
            const row = {};
            pathArray.forEach((val, idx) => {
                row[`level${idx + 1}`] = val.trim();
            });
            return row;
        },
        async dirWalker() {
            const selectedDirectory = await window.electronAPI.selectDirectory();
            if (!selectedDirectory) return;
            this.selectedDirectory = selectedDirectory;

            const structure = await this.recursiveLoad(selectedDirectory);

            const flatPaths = [];
            this.flattenToTable(structure, [], flatPaths);

            const filtered = this.filterLatestEntries(flatPaths);
            this.folderTable = filtered;
            this.dirWalkerDialog = true;
        },
        isDuplicate(list, index, key) {
            if (index === 0) return false;

            if (key === 'level1') {
                return list[index].level1 === list[index - 1].level1;
            }

            if (key === 'level2') {
                return (
                    list[index].level2 === list[index - 1].level2 && list[index].level1 === list[index - 1].level1 // 父層必須一致
                );
            }

            return false;
        },

        getRowSpan(list, index, key) {
            const current = list[index][key];
            let count = 1;

            for (let i = index + 1; i < list.length; i++) {
                const next = list[i];

                if (key === 'level1') {
                    if (next.level1 === current) {
                        count++;
                    } else {
                        break;
                    }
                }

                if (key === 'level2') {
                    const sameValue = next.level2 === current;
                    const sameParent = next.level1 === list[index].level1;
                    if (sameValue && sameParent) {
                        count++;
                    } else {
                        break;
                    }
                }
            }

            return count;
        },
        async handleCopyFolders() {
            const selectedItems = this.folderTable
                .map((item, idx) => (this.folderSelection[idx] ? item : null))
                .filter(Boolean);

            if (!this.newFolderName || selectedItems.length === 0) {
                this.hide_cardAlert('請輸入資料夾名稱並至少勾選一項', 'red', 'mdi-alert', 2000);
                return;
            }

            for (const item of selectedItems) {
                const relativePath = [item.level1, item.level2, item.level3].filter(Boolean).join('/');
                const srcFolder = `${this.selectedDirectory}/${relativePath}/${item.level4}`.replace(/\\/g, '/');
                const dstFolder = `${this.selectedDirectory}/${relativePath}/${this.newFolderName}`.replace(/\\/g, '/');

                try {
                    await window.electronAPI.copyFolderWithMarkdown(srcFolder, dstFolder);
                    this.hide_cardAlert('複製完成', 'green', 'mdi-check', 2000);
                    console.log('sccuss:', srcFolder, dstFolder);
                } catch (err) {
                    this.hide_cardAlert(`複製失敗: ${srcFolder}`, 'red', 'mdi-alert-circle', 3000);
                    console.log('err:', srcFolder, dstFolder);
                    continue;
                }
            }
        },
    },
    components: {
        EditorComponent,
        ConfirmDlg,
        FileExplorer,
    },
    data() {
        return {
            editorInstance: null, // 用於儲存編輯器實例
            alert: { flag: false, text: '', color: 'red', icon: '' },
            cardAlert: { flag: false, text: '', color: 'red', icon: '' },
            currentPath: '尚未選擇路徑',
            currentFilePath: '',
            originalHash: '', // 用於存儲原始內容的哈希值
            dirWalkerDialog: false,
            folderTable: [],
            folderSelection: [],
            newFolderName: '',
            selectedDirectory: '',
        };
    },
    mounted() {
        window.app = this; // 將 Vue 實例掛載到 window 對象
    },
};
</script>
<style scoped>
.dense-table td {
    padding: 4px 8px !important; /* 控制單元格內距 */
    font-size: 13px !important; /* 字體稍微縮小 */
    line-height: 1.2 !important; /* 壓縮行距 */
}

.dense-table th {
    padding: 6px 10px !important;
    font-size: 13px !important;
}
</style>
