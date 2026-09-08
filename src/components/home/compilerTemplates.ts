import type { Language } from './compilerApi';

/** 各语言的默认代码模板 */
export const CODE_TEMPLATES: Record<Language, string> = {
  python: `# Python 在线编译器
name = "Arin"
print(f"Hello, {name}!")
`,

  cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    cin >> name;
    cout << "Hello, " << name << "!" << endl;
    return 0;
}
`,

  html: `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>HTML 演示</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #2f845e; }
    .box { background: #e8f4eb; padding: 16px; border-radius: 8px; margin: 12px 0; }
  </style>
</head>
<body>
  <h1>Hello, HTML!</h1>
  <div class="box">
    <p>在这里写你的 HTML 代码。</p>
    <p>右侧会实时预览效果。</p>
  </div>
</body>
</html>
`,
};
