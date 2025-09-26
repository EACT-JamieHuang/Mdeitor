import * as parserHtml from 'prettier/parser-html';
import * as parserMarkdown from 'prettier/parser-markdown';
import prettier from 'prettier/standalone';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import {unified} from 'unified';

/**
 * 格式化 Markdown 內容中的 HTML 區塊（例如 <table>）
 * 只會針對 type === 'html' 的 AST 節點進行 Prettier 處理
 * @param {string} markdown 原始 markdown 字串
 * @returns {Promise<string>} 格式化後的 markdown
 */
export async function formatMarkdownWithHtmlBlocks(markdown) {
  const processor = unified().use(remarkParse).use(remarkStringify, {
    bullet: '-',  // 控制無序列表的符號
    rule: '-'     // 控制水平分隔線的符號
  });

  const tree = processor.parse(markdown);
  console.log('tree\n', tree);

  for (const node of tree.children) {
    if (node.type === 'html') {
      try {
        node.value = await prettier.format(node.value, {
          parser: 'html',
          plugins: [parserHtml, parserMarkdown],
          htmlWhitespaceSensitivity: 'ignore',
          tabWidth: 2,
        });
      } catch (e) {
        console.warn('HTML 格式化失敗，保留原樣：', e, '值', node.value);
      }
    }
  }
  console.log('tree\n', tree);

  return processor.stringify(tree);
}
